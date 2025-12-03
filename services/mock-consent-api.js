import express from 'express';
import { Kafka } from 'kafkajs';
import { v4 as uuid } from 'uuid';
import { BROKERS, CONSENT_TOPIC } from './config.js';
import { allowAll } from './utils/cors.js';

const app = express();
app.use(express.json());
app.use(allowAll);

const k = new Kafka({ brokers: BROKERS });
const producer = k.producer();
await producer.connect();

// in-memory pending requests keyed by citizenId
const pending = new Map(); // citizenId -> ConsentReq[]

app.post('/consent/request', async (req, res) => {
  const { rp='dwp', caseId, citizenId, scopes=['prescriptions'] } = req.body;
  if (!caseId || !citizenId) return res.status(400).json({ ok:false, error:'caseId and citizenId required' });
  const evt = { eventType:'request', consentId:uuid(), rp, caseId, citizenId, scopes, issuedAt:new Date().toISOString() };
  await producer.send({ topic: CONSENT_TOPIC, messages:[{ key:`${rp}|${caseId}|${citizenId}`, value:JSON.stringify(evt) }] });
  const list = pending.get(citizenId) || [];
  list.push(evt); pending.set(citizenId, list);
  res.json({ ok:true, evt });
});

app.get('/consent/pending', (req, res) => {
  const { citizenId } = req.query;
  res.json((citizenId && pending.get(citizenId)) || []);
});

app.post('/consent/grant', async (req, res) => {
  const { rp='dwp', caseId, citizenId, scopes=['prescriptions'], ttlDays=90 } = req.body;
  if (!caseId || !citizenId) return res.status(400).json({ ok:false, error:'caseId and citizenId required' });
  const filtered = (pending.get(citizenId) || []).filter(r => !(r.caseId===caseId && r.rp===rp));
  pending.set(citizenId, filtered);
  const evt = { eventType:'grant', consentId:uuid(), rp, caseId, citizenId, scopes, issuedAt:new Date().toISOString(), expiresAt:new Date(Date.now()+ttlDays*864e5).toISOString() };
  await producer.send({ topic: CONSENT_TOPIC, messages:[{ key:`${rp}|${caseId}|${citizenId}`, value:JSON.stringify(evt) }] });
  res.json({ ok:true, evt });
});

app.post('/consent/revoke', async (req, res) => {
  const { rp='dwp', caseId, citizenId } = req.body;
  if (!caseId || !citizenId) return res.status(400).json({ ok:false, error:'caseId and citizenId required' });
  const evt = { eventType:'revoke', rp, caseId, citizenId, at:new Date().toISOString() };
  await producer.send({ topic: CONSENT_TOPIC, messages:[{ key:`${rp}|${caseId}|${citizenId}`, value:JSON.stringify(evt) }] });
  res.json({ ok:true, evt });
});

app.listen(4000, ()=>console.log('Consent API on :4000'));
