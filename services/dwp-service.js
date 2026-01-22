import express from 'express';
import { CONSENT_TOPIC, groupId, RUN_ID } from './config.js';
import { createKafka, viewTopic } from './lib/kafka.js';
import { allowAll } from './utils/cors.js';

const app = express();
app.use(express.json());
app.use(allowAll);

const cases = new Map(); // caseId -> { caseId, citizenId, status, scopes, view: [] }
const kafka = createKafka(`dwp-service-${RUN_ID}`);

const consent = kafka.consumer({ groupId: groupId('dwp-consent-status') });
await consent.connect();
await consent.subscribe({ topic: CONSENT_TOPIC, fromBeginning: true });

const consumersByCase = new Map();
async function ensureViewConsumer(caseId, citizenId) {
  if (consumersByCase.has(caseId)) return;
  const topic = viewTopic(caseId, citizenId);
  const consumer = kafka.consumer({ groupId: groupId(`dwp-case-view-${caseId}`) });
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });
  console.log('[dwp] subscribed to', topic);
  await consumer.run({
    eachMessage: async ({ message }) => {
      const m = JSON.parse(message.value.toString());
      const entry = getCase(caseId, citizenId);
      entry.view = entry.view || [];
      entry.status = entry.status === 'revoked' ? 'revoked' : 'granted';
      entry.lastEventAt = m.at || new Date().toISOString();
      entry.view.push({ ts: Date.now(), v: m });
      cases.set(caseId, entry);
      console.log('[dwp:view]', topic, m.prescription);
    }
  });
  consumersByCase.set(caseId, consumer);
}

function getCase(caseId, citizenId, scopes = []) {
  const existing = cases.get(caseId);
  const base = existing || {
    caseId,
    citizenId,
    status: 'requested',
    scopes: new Set(scopes),
    requestedAt: null,
    expiresAt: null,
    lastEventAt: null,
    view: []
  };
  base.citizenId = citizenId || base.citizenId;
  if (!base.scopes) base.scopes = new Set();
  scopes.forEach((s) => base.scopes.add(s));
  return base;
}

consent.run({
  eachMessage: async ({ message }) => {
    const evt = JSON.parse(message.value.toString());
    if (evt.rp !== 'dwp') return;
    const { caseId, citizenId, scopes = [] } = evt;
    const entry = getCase(caseId, citizenId, scopes);

    if (evt.eventType === 'request') {
      entry.status = 'requested';
      entry.requestedAt = evt.issuedAt;
      entry.lastEventAt = evt.issuedAt;
      cases.set(caseId, entry);
      return;
    }

    if (evt.eventType === 'grant') {
      entry.status = 'granted';
      entry.expiresAt = evt.expiresAt;
      entry.lastEventAt = evt.issuedAt;
      entry.requestedAt = entry.requestedAt || evt.issuedAt;
      entry.view = entry.view || [];
      cases.set(caseId, entry);
      await ensureViewConsumer(caseId, citizenId);
      return;
    }

    if (evt.eventType === 'revoke') {
      entry.status = 'revoked';
      entry.lastEventAt = evt.at || new Date().toISOString();
      cases.set(caseId, entry);
      return;
    }
  }
});

app.get('/api/cases', (_req, res) => {
  res.json(
    Array.from(cases.values()).map((c) => ({
      caseId: c.caseId,
      citizenId: c.citizenId,
      status: c.status,
      scopes: Array.from(c.scopes || []),
      requestedAt: c.requestedAt || null,
      expiresAt: c.expiresAt || null,
      lastEventAt: c.lastEventAt || null,
      totalPrescriptions: c.view?.length || 0,
      latestPrescription: c.view?.at(-1)?.v?.prescription?.drug || null,
      lastViewAt: c.view?.at(-1)?.v?.at || null
    }))
  );
});

app.get('/api/case/:id/view', (req, res) => {
  res.json(cases.get(req.params.id)?.view || []);
});

app.listen(5001, () => console.log('DWP Service on :5001 (GET /api/cases, /api/case/:id/view)'));
