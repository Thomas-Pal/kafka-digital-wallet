import express from 'express';
import { Kafka } from 'kafkajs';
import { v4 as uuid } from 'uuid';
import { BROKERS, CONSENT_TOPIC } from './config.js';

const app = express();
app.use(express.json());
app.use((_, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  next();
});
app.options('*', (_req, res) => res.sendStatus(204));

const kafka = new Kafka({ brokers: BROKERS });
const producer = kafka.producer();
await producer.connect();

// In-memory request/consent status store for the demo wallet to poll
// key: rp|case|citizen -> { status: 'not_requested'|'requested'|'granted'|'revoked', lastUpdated: ISO }
const statusStore = new Map();
const keyFor = (rp, caseId, citizenId) => `${rp}|${caseId}|${citizenId}`;

const updateStatus = (rp, caseId, citizenId, status) => {
  statusStore.set(keyFor(rp, caseId, citizenId), {
    status,
    lastUpdated: new Date().toISOString()
  });
};

app.get('/consent/status/:rp/:caseId/:citizenId', (req, res) => {
  const { rp, caseId, citizenId } = req.params;
  const current = statusStore.get(keyFor(rp, caseId, citizenId)) || {
    status: 'not_requested',
    lastUpdated: null
  };
  res.json({ rp, caseId, citizenId, ...current });
});

app.post('/consent/request', (req, res) => {
  const { rp, caseId, citizenId } = req.body;
  updateStatus(rp, caseId, citizenId, 'requested');
  res.json({ ok: true, rp, caseId, citizenId, status: 'requested' });
});

app.post('/consent/grant', async (req, res) => {
  const { rp, caseId, citizenId, scopes, ttlDays = 90 } = req.body;
  const evt = {
    eventType: 'grant',
    consentId: uuid(),
    rp,
    caseId,
    citizenId,
    scopes,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ttlDays * 864e5).toISOString()
  };
  await producer.send({ topic: CONSENT_TOPIC, messages: [{ key: `${rp}|${caseId}|${citizenId}`, value: JSON.stringify(evt) }] });
  updateStatus(rp, caseId, citizenId, 'granted');
  res.json({ ok: true, evt });
});

app.post('/consent/revoke', async (req, res) => {
  const { rp, caseId, citizenId } = req.body;
  const evt = { eventType: 'revoke', rp, caseId, citizenId, at: new Date().toISOString() };
  await producer.send({ topic: CONSENT_TOPIC, messages: [{ key: `${rp}|${caseId}|${citizenId}`, value: JSON.stringify(evt) }] });
  updateStatus(rp, caseId, citizenId, 'revoked');
  res.json({ ok: true, evt });
});

app.listen(4000, () => console.log('Consent API on :4000'));
