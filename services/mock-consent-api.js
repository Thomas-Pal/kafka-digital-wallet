import express from 'express';
import { Kafka } from 'kafkajs';
import { v4 as uuid } from 'uuid';
import { BROKERS, CONSENT_TOPIC } from './config.js';

const app = express();
app.use(express.json());
app.use((_, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  next();
});
app.options('*', (_req, res) => res.sendStatus(204));

const kafka = new Kafka({ brokers: BROKERS });
const producer = kafka.producer();
await producer.connect();

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
  await producer.send({
    topic: CONSENT_TOPIC,
    messages: [{ key: `${rp}|${caseId}|${citizenId}`, value: JSON.stringify(evt) }]
  });
  res.json({ ok: true, evt });
});

app.post('/consent/revoke', async (req, res) => {
  const { rp, caseId, citizenId } = req.body;
  const evt = { eventType: 'revoke', rp, caseId, citizenId, at: new Date().toISOString() };
  await producer.send({
    topic: CONSENT_TOPIC,
    messages: [{ key: `${rp}|${caseId}|${citizenId}`, value: JSON.stringify(evt) }]
  });
  res.json({ ok: true, evt });
});

app.listen(4000, () => console.log('Consent API on :4000'));
