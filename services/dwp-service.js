import express from 'express';
import { RUN_ID, groupId } from './config.js';
import { createKafka, waitForBroker } from './lib/kafka.js';
import { allowAll } from './utils/cors.js';

const app = express();
app.use(express.json());
app.use(allowAll);

const cases = new Map();
const kafka = createKafka(`dwp-service-${RUN_ID}`);
await waitForBroker(kafka);

const consumer = kafka.consumer({ groupId: groupId('dwp-views') });
await consumer.connect();
await consumer.subscribe({ topic: /^views\.permitted\.dwp\..+$/, fromBeginning: true });

await consumer.run({
  eachMessage: async ({ topic, message }) => {
    const payload = JSON.parse(message.value.toString());
    const caseId = payload.caseId || 'unknown';
    const entry = cases.get(caseId) || {
      caseId,
      citizenId: payload.citizenId,
      consent: 'granted',
      scope: topic.split('.').slice(-1)[0],
      view: []
    };
    entry.citizenId = payload.citizenId || entry.citizenId;
    entry.consent = 'granted';
    entry.view = entry.view || [];
    entry.view.push({ ts: Date.now(), v: payload });
    entry.lastEventAt = payload.emittedAt || new Date().toISOString();
    cases.set(caseId, entry);
    console.log('[dwp:view]', caseId, payload.source);
  }
});

app.get('/api/cases', (_req, res) => {
  res.json(
    Array.from(cases.values()).map((c) => ({
      caseId: c.caseId,
      citizenId: c.citizenId,
      type: c.scope === 'disability' ? 'nhs' : 'termination',
      consent: c.consent
    }))
  );
});

app.get('/api/case/:id/view', (req, res) => {
  res.json(cases.get(req.params.id)?.view || []);
});

app.listen(5001, () => console.log('DWP Service on :5001 (GET /api/cases, /api/case/:id/view)'));
