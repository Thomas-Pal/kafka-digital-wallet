import express from 'express';
import { Kafka, logLevel } from 'kafkajs';
import { BROKERS, CONSENT_TOPIC, viewTopic } from './config.js';
import { allowAll } from './utils/cors.js';

const app = express();
app.use(express.json());
app.use(allowAll);

const k = new Kafka({ brokers: BROKERS, logLevel: logLevel.NOTHING });

// in-memory case registry
// caseId -> { caseId, citizenId, status: 'requested'|'granted'|'revoked' }
const cases = new Map();
// caseId -> buffered view rows
const buffers = new Map();

// track consent to set statuses and subscribe to new view topics when granted
const consent = k.consumer({ groupId:'dwp-consent-status' });
await consent.connect();
await consent.subscribe({ topic: CONSENT_TOPIC, fromBeginning:true });

const consumersByCase = new Map(); // caseId -> consumer

async function ensureViewConsumer(caseId, citizenId) {
  if (consumersByCase.has(caseId)) return;
  const topic = viewTopic(caseId, citizenId);
  const consumer = k.consumer({ groupId: `dwp-case-view-${caseId}` });
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning:true });
  await consumer.run({
    eachMessage: async ({ message }) => {
      const v = JSON.parse(message.value.toString());
      const arr = buffers.get(caseId) || [];
      arr.push({ ts: Date.now(), v });
      if (arr.length > 200) arr.shift();
      buffers.set(caseId, arr);
    }
  });
  consumersByCase.set(caseId, consumer);
}

consent.run({
  eachMessage: async ({ message }) => {
    const evt = JSON.parse(message.value.toString());
    if (evt.rp !== 'dwp') return;
    const { caseId, citizenId, eventType } = evt;
    if (!cases.has(caseId)) cases.set(caseId, { caseId, citizenId, status: 'requested' });

    if (eventType === 'request') cases.get(caseId).status = 'requested';
    if (eventType === 'grant')  { cases.get(caseId).status = 'granted'; await ensureViewConsumer(caseId, citizenId); }
    if (eventType === 'revoke') cases.get(caseId).status = 'revoked';
  }
});

app.get('/api/cases', (_req,res)=> res.json(Array.from(cases.values())));
app.get('/api/case/:id/view', (req,res)=> res.json((buffers.get(req.params.id) || []).slice(-100)));

app.listen(5001, ()=>console.log('DWP Service on :5001 (GET /api/cases, /api/case/:id/view)'));
