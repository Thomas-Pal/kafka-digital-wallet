import { Kafka, logLevel } from 'kafkajs';
import express from 'express';
import { BROKERS, CONSENT_TOPIC, DEMO_CASES, CONSENT_API_URL } from './config.js';

const app = express();
app.use((_, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  next();
});
app.options('*', (_req, res) => res.sendStatus(204));

const kafka = new Kafka({ brokers: BROKERS, logLevel: logLevel.NOTHING });
const RUN_ID = process.env.RUN_ID || `${Date.now()}`;
const viewConsumer = kafka.consumer({ groupId: `dwp-case-views-${RUN_ID}` });
const consentConsumer = kafka.consumer({ groupId: `dwp-consent-status-${RUN_ID}` });

async function waitForKafka() {
  const admin = kafka.admin();
  try {
    await admin.connect();
    let ready = false;
    while (!ready) {
      try {
        await admin.fetchTopicMetadata({ topics: [CONSENT_TOPIC] });
        ready = true;
      } catch (err) {
        console.warn('[dwp-api] waiting for Kafka...', err.message);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  } finally {
    await admin.disconnect().catch(() => {});
  }
}

const cases = new Map(
  DEMO_CASES.map((c) => [
    c.caseId,
    {
      ...c,
      consentRequested: false,
      consentStatus: 'not_requested',
      lastConsentEvent: null,
      rows: []
    }
  ])
);

async function runWithRetry(label, consumer, handler) {
  while (true) {
    try {
      await consumer.run({ eachMessage: handler });
    } catch (err) {
      console.error(`[${label}] restart in 2s`, err.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function startViewConsumer() {
  await viewConsumer.connect();
  // Use a regex subscription so new view topics created by the gatekeeper are picked up automatically
  await viewConsumer.subscribe({ topic: /^views\.permitted\.dwp\..+$/, fromBeginning: true });
  await runWithRetry('dwp-views', viewConsumer, async ({ topic, message }) => {
    const value = JSON.parse(message.value.toString());
    const [, , , caseId, citizenId] = topic.split('.');
    if (!cases.has(caseId)) {
      cases.set(caseId, {
        caseId,
        citizenId,
        citizenName: citizenId,
        rp: 'dwp',
        consentRequested: true,
        consentStatus: 'granted',
        lastConsentEvent: new Date().toISOString(),
        rows: []
      });
    }
    const current = cases.get(caseId);
    current.rows.push({ ts: Date.now(), v: value });
    current.consentRequested = true;
    current.consentStatus = 'granted';
    current.lastConsentEvent = new Date().toISOString();
    cases.set(caseId, { ...current });
    console.log('DWP VIEW:', caseId, value.patientId, value.prescription.drug);
  });
}

async function startConsentConsumer() {
  await consentConsumer.connect();
  await consentConsumer.subscribe({ topic: CONSENT_TOPIC, fromBeginning: true });
  await runWithRetry('dwp-consent-status', consentConsumer, async ({ message }) => {
    const evt = JSON.parse(message.value.toString());
    const current = cases.get(evt.caseId);
    if (!current) return;
    if (evt.eventType === 'grant') {
      current.consentRequested = true;
      current.consentStatus = 'granted';
      current.lastConsentEvent = evt.issuedAt;
    }
    if (evt.eventType === 'revoke') {
      current.consentRequested = true;
      current.consentStatus = 'revoked';
      current.lastConsentEvent = evt.at;
    }
    cases.set(evt.caseId, { ...current });
    console.log('[consent-status]', evt.caseId, current.consentStatus);
  });
}

app.get('/api/cases', (_req, res) => {
  res.json(
    Array.from(cases.values()).map((c) => ({
      caseId: c.caseId,
      citizenId: c.citizenId,
      citizenName: c.citizenName,
      consentRequested: c.consentRequested,
      consentStatus: c.consentStatus,
      lastConsentEvent: c.lastConsentEvent,
      latestPrescription: c.rows.at(-1)?.v?.prescription?.drug || null
    }))
  );
});

app.post('/api/case/:caseId/request-consent', (req, res) => {
  const current = cases.get(req.params.caseId);
  if (!current) return res.status(404).json({ ok: false, message: 'Unknown case' });
  current.consentRequested = true;
  current.consentStatus = 'requested';
  current.lastConsentEvent = new Date().toISOString();
  cases.set(req.params.caseId, { ...current });
  fetch(`${CONSENT_API_URL}/consent/request`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ rp: current.rp, caseId: current.caseId, citizenId: current.citizenId })
  }).catch((err) => console.error('Failed to notify consent service of request', err));
  res.json({ ok: true, caseId: req.params.caseId, status: current.consentStatus });
});

app.get('/api/case/:caseId/view', (req, res) => {
  const current = cases.get(req.params.caseId);
  if (!current) return res.status(404).json({ ok: false, message: 'Unknown case' });
  res.json(current.rows.slice(-50));
});

waitForKafka()
  .then(() => Promise.all([startViewConsumer(), startConsentConsumer()]))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

app.listen(5001, () => console.log('DWP API on :5001 (GET /api/cases, POST /api/case/:caseId/request-consent, GET /api/case/:caseId/view)'));
