import express from 'express';
import { CONSENT_TOPIC, groupId, RUN_ID } from './config.js';
import { createKafka, viewTopic } from './lib/kafka.js';
import { allowAll } from './utils/cors.js';

const app = express();
app.use(express.json());
app.use(allowAll);

const cases = new Map(); // caseId -> { caseId, citizenId, status, view: [] }
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
      const entry = cases.get(caseId) || { caseId, citizenId, status: 'granted', view: [] };
      entry.view = entry.view || [];
      entry.view.push(m);
      cases.set(caseId, entry);
      console.log('[dwp:view]', topic, m.prescription);
    }
  });
  consumersByCase.set(caseId, consumer);
}

consent.run({
  eachMessage: async ({ message }) => {
    const evt = JSON.parse(message.value.toString());
    if (evt.rp !== 'dwp' || evt.eventType !== 'grant') return;
    const { caseId, citizenId } = evt;
    const entry = cases.get(caseId) || { caseId, citizenId, status: 'granted', view: [] };
    entry.citizenId = citizenId;
    entry.status = 'granted';
    entry.view = entry.view || [];
    cases.set(caseId, entry);
    await ensureViewConsumer(caseId, citizenId);
  }
});

app.get('/api/cases', (_req, res) => {
  res.json(Array.from(cases.values()));
});

app.get('/api/case/:id/view', (req, res) => {
  res.json(cases.get(req.params.id)?.view || []);
});

app.listen(5001, () => console.log('DWP Service on :5001 (GET /api/cases, /api/case/:id/view)'));
