import { Kafka, logLevel } from 'kafkajs';
import express from 'express';
import { BROKERS, VIEW_TOPIC, CONSENT_TOPIC, DEMO_CASES } from './config.js';

const app = express();
app.use((_, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  next();
});
app.options('*', (_req, res) => res.sendStatus(204));

const kafka = new Kafka({ brokers: BROKERS, logLevel: logLevel.NOTHING });
const viewConsumer = kafka.consumer({ groupId: 'dwp-case-views' });
const consentConsumer = kafka.consumer({ groupId: 'dwp-consent-status' });

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

async function startViewConsumer() {
  await viewConsumer.connect();
  for (const c of DEMO_CASES) {
    await viewConsumer.subscribe({ topic: VIEW_TOPIC(c.caseId, c.citizenId), fromBeginning: true });
  }
  await viewConsumer.run({
    eachMessage: async ({ topic, message }) => {
      const value = JSON.parse(message.value.toString());
      const [_, __, ___, caseId] = topic.split('.');
      const current = cases.get(caseId);
      if (!current) return;
      current.rows.push({ ts: Date.now(), v: value });
      current.consentRequested = true;
      current.consentStatus = 'granted';
      current.lastConsentEvent = new Date().toISOString();
      cases.set(caseId, { ...current });
      console.log('DWP VIEW:', caseId, value.patientId, value.prescription.drug);
    }
  });
}

async function startConsentConsumer() {
  await consentConsumer.connect();
  await consentConsumer.subscribe({ topic: CONSENT_TOPIC, fromBeginning: true });
  await consentConsumer.run({
    eachMessage: async ({ message }) => {
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
    }
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
  res.json({ ok: true, caseId: req.params.caseId, status: current.consentStatus });
});

app.get('/api/case/:caseId/view', (req, res) => {
  const current = cases.get(req.params.caseId);
  if (!current) return res.status(404).json({ ok: false, message: 'Unknown case' });
  res.json(current.rows.slice(-50));
});

Promise.all([startViewConsumer(), startConsentConsumer()]).catch((err) => {
  console.error(err);
  process.exit(1);
});

app.listen(5001, () => console.log('DWP API on :5001 (GET /api/cases, POST /api/case/:caseId/request-consent, GET /api/case/:caseId/view)'));
