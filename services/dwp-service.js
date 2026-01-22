import express from 'express';
import { CONSENT_TOPIC, groupId, RUN_ID } from './config.js';
import { createKafka, waitForBroker } from './lib/kafka.js';
import { allowAll } from './utils/cors.js';

const app = express();
app.use(express.json());
app.use(allowAll);

const CASES = [
  { caseId: '9001', citizenId: 'nhs-999', type: 'nhs', scope: 'nhs.prescriptions' },
  { caseId: 'TERM-1001', citizenId: 'emp-999', type: 'termination', scope: 'employment.termination' }
];

const cases = new Map();
const kafka = createKafka(`dwp-service-${RUN_ID}`);
await waitForBroker(kafka);

CASES.forEach((c) => {
  cases.set(c.caseId, { ...c, consent: 'pending', view: [] });
});

const consent = kafka.consumer({ groupId: groupId('dwp-consent-status') });
await consent.connect();
await consent.subscribe({ topic: CONSENT_TOPIC, fromBeginning: true });

const consumersByCase = new Map();
async function ensureViewConsumer(caseId, scope) {
  if (consumersByCase.has(caseId)) return;
  const topic = `views.permitted.dwp.${caseId}.${scope}`;
  const consumer = kafka.consumer({ groupId: groupId(`dwp-case-view-${caseId}`) });
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });
  console.log('[dwp] subscribed to', topic);
  await consumer.run({
    eachMessage: async ({ message }) => {
      const m = JSON.parse(message.value.toString());
      const entry = cases.get(caseId) || { caseId, scope, view: [], consent: 'pending' };
      entry.view = entry.view || [];
      entry.consent = 'granted';
      entry.lastEventAt = m.routedAt || new Date().toISOString();
      entry.view.push({ ts: Date.now(), v: m });
      cases.set(caseId, entry);
      console.log('[dwp:view]', topic, m.scope, m.citizenId);
    }
  });
  consumersByCase.set(caseId, consumer);
}

consent.run({
  eachMessage: async ({ message }) => {
    const evt = JSON.parse(message.value.toString());
    if (evt.rp !== 'dwp') return;
    const entry = cases.get(evt.caseId);
    if (!entry) return;

    if (evt.eventType === 'request') {
      entry.consent = 'pending';
      entry.requestedAt = evt.issuedAt;
      entry.lastEventAt = evt.issuedAt;
    }

    if (evt.eventType === 'grant') {
      entry.consent = 'granted';
      entry.expiresAt = evt.expiresAt;
      entry.lastEventAt = evt.issuedAt;
      entry.requestedAt = entry.requestedAt || evt.issuedAt;
      await ensureViewConsumer(entry.caseId, entry.scope);
    }

    if (evt.eventType === 'revoke') {
      entry.consent = 'expired';
      entry.lastEventAt = evt.at || new Date().toISOString();
    }

    cases.set(entry.caseId, entry);
  }
});

CASES.forEach((c) => {
  ensureViewConsumer(c.caseId, c.scope).catch((err) => console.error('[dwp] failed to subscribe', err));
});

app.get('/api/consent-status', (_req, res) => {
  res.json(
    Array.from(cases.values()).map((c) => ({
      caseId: c.caseId,
      citizenId: c.citizenId,
      type: c.type,
      consent: c.consent
    }))
  );
});

app.get('/api/case/:id/view', (req, res) => {
  res.json(cases.get(req.params.id)?.view || []);
});

app.listen(5001, () => console.log('DWP Service on :5001 (GET /api/consent-status, /api/case/:id/view)'));
