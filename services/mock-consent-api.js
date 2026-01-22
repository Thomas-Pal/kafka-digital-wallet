import express from 'express';
import { v4 as uuid } from 'uuid';
import { CONSENT_TOPIC } from './config.js';
import { createKafka, waitForBroker } from './lib/kafka.js';
import { allowAll } from './utils/cors.js';

const app = express();
app.use(express.json());
app.use(allowAll);

const k = createKafka('consent-api');
await waitForBroker(k);
const producer = k.producer();
await producer.connect();

// in-memory pending and active consents keyed by citizenId
const pending = new Map(); // citizenId -> ConsentReq[]
const active = new Map(); // citizenId -> ConsentGrant[]

app.post('/consent/request', async (req, res) => {
  const { rp='dwp', caseId, citizenId, scopes=['nhs.prescriptions'] } = req.body;
  if (!caseId || !citizenId) return res.status(400).json({ ok:false, error:'caseId and citizenId required' });
  const evt = { eventType:'request', consentId:uuid(), rp, caseId, citizenId, scopes, issuedAt:new Date().toISOString() };
  await producer.send({ topic: CONSENT_TOPIC, messages:[{ key: citizenId, value:JSON.stringify(evt) }] });
  const list = pending.get(citizenId) || [];
  list.push(evt); pending.set(citizenId, list);
  res.json({ ok:true, evt });
});

app.get('/consent/pending', (req, res) => {
  const { citizenId } = req.query;
  res.json((citizenId && pending.get(citizenId)) || []);
});

app.get('/consent/active', (req, res) => {
  const { citizenId } = req.query;
  res.json((citizenId && active.get(citizenId)) || []);
});

app.post('/consent/grant', async (req, res) => {
  const { rp='dwp', caseId, citizenId, scopes=['nhs.prescriptions'], ttlDays=90 } = req.body;
  if (!caseId || !citizenId) return res.status(400).json({ ok:false, error:'caseId and citizenId required' });
  const filtered = (pending.get(citizenId) || []).filter(r => !(r.caseId===caseId && r.rp===rp));
  pending.set(citizenId, filtered);
  const grantedAt = new Date().toISOString();
  const evt = { eventType:'grant', consentId:uuid(), rp, caseId, citizenId, scopes, issuedAt:grantedAt, expiresAt:new Date(Date.now()+ttlDays*864e5).toISOString() };
  await producer.send({ topic: CONSENT_TOPIC, messages:[{ key: citizenId, value:JSON.stringify(evt) }] });
  const current = active.get(citizenId) || [];
  const remaining = current.filter(r => !(r.caseId === caseId && r.rp === rp));
  remaining.push({ rp, caseId, citizenId, scopes, grantedAt, expiresAt: evt.expiresAt });
  active.set(citizenId, remaining);
  res.json({ ok:true, evt });
});

app.post('/consent/revoke', async (req, res) => {
  const { rp='dwp', caseId, citizenId } = req.body;
  if (!caseId || !citizenId) return res.status(400).json({ ok:false, error:'caseId and citizenId required' });
  const evt = { eventType:'revoke', rp, caseId, citizenId, at:new Date().toISOString() };
  await producer.send({ topic: CONSENT_TOPIC, messages:[{ key: citizenId, value:JSON.stringify(evt) }] });
  const current = active.get(citizenId) || [];
  active.set(citizenId, current.filter(r => !(r.caseId === caseId && r.rp === rp)));
  res.json({ ok:true, evt });
});

app.listen(4000, ()=>console.log('Consent API on :4000'));
