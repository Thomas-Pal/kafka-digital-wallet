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
const activeById = new Map(); // consentId -> { rp, caseId, citizenId }

const listPending = () => Array.from(pending.values()).flat();
const addPending = (citizenId, req) => {
  const list = pending.get(citizenId) || [];
  list.push(req);
  pending.set(citizenId, list);
};
const removePending = (citizenId, requestId) => {
  const list = pending.get(citizenId) || [];
  const next = list.filter((r) => r.id !== requestId);
  pending.set(citizenId, next);
};

async function revokeConsent(consentId) {
  const info = activeById.get(consentId);
  if (!info) return;
  const { rp = 'dwp', caseId, citizenId } = info;
  const evt = { eventType: 'revoke', rp, caseId, citizenId, at: new Date().toISOString() };
  await producer.send({ topic: CONSENT_TOPIC, messages: [{ key: citizenId, value: JSON.stringify(evt) }] });
  const current = active.get(citizenId) || [];
  active.set(citizenId, current.filter((r) => !(r.caseId === caseId && r.rp === rp)));
  activeById.delete(consentId);
}

function scheduleRevoke(consentId, expiresAtMs) {
  const now = Date.now();
  const delay = Math.max(0, expiresAtMs - now);
  setTimeout(() => revokeConsent(consentId), delay || 0);
}

async function createRequest(body, res) {
  const { rp = 'dwp', caseId, citizenId, scopes = ['nhs.prescriptions'] } = body;
  if (!caseId || !citizenId) return res.status(400).json({ ok: false, error: 'caseId and citizenId required' });
  const evt = { eventType: 'request', consentId: uuid(), rp, caseId, citizenId, scopes, issuedAt: new Date().toISOString() };
  await producer.send({ topic: CONSENT_TOPIC, messages: [{ key: citizenId, value: JSON.stringify(evt) }] });
  addPending(citizenId, { id: evt.consentId, rp, caseId, citizenId, scopes, issuedAt: evt.issuedAt });
  return res.json({ ok: true, evt });
}

app.post('/consent/request', async (req, res) => {
  await createRequest(req.body, res);
});

app.post('/api/request', async (req, res) => {
  await createRequest(req.body, res);
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
  const consentId = uuid();
  const evt = { eventType:'grant', consentId, rp, caseId, citizenId, scopes, issuedAt:grantedAt, expiresAt:new Date(Date.now()+ttlDays*864e5).toISOString() };
  await producer.send({ topic: CONSENT_TOPIC, messages:[{ key: citizenId, value:JSON.stringify(evt) }] });
  const current = active.get(citizenId) || [];
  const remaining = current.filter(r => !(r.caseId === caseId && r.rp === rp));
  remaining.push({ rp, caseId, citizenId, scopes, grantedAt, expiresAt: evt.expiresAt });
  active.set(citizenId, remaining);
  activeById.set(consentId, { rp, caseId, citizenId });
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

app.get('/api/requests', (_req, res) => {
  res.json(listPending());
});

app.post('/api/approve', async (req, res) => {
  const { requestId, ttlMinutes = 180 } = req.body || {};
  if (!requestId) return res.status(400).json({ ok: false, error: 'requestId required' });
  const request = listPending().find((r) => r.id === requestId);
  if (!request) return res.status(404).json({ ok: false, error: 'request not found' });
  removePending(request.citizenId, requestId);
  const grantedAtMs = Date.now();
  const expiresAtMs = grantedAtMs + ttlMinutes * 60 * 1000;
  const consentId = uuid();
  const evt = {
    eventType: 'grant',
    consentId,
    rp: request.rp,
    caseId: request.caseId,
    citizenId: request.citizenId,
    scopes: request.scopes,
    issuedAt: new Date(grantedAtMs).toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString()
  };
  await producer.send({ topic: CONSENT_TOPIC, messages: [{ key: request.citizenId, value: JSON.stringify(evt) }] });
  const current = active.get(request.citizenId) || [];
  const remaining = current.filter((r) => !(r.caseId === request.caseId && r.rp === request.rp));
  remaining.push({
    rp: request.rp,
    caseId: request.caseId,
    citizenId: request.citizenId,
    scopes: request.scopes,
    grantedAt: evt.issuedAt,
    expiresAt: evt.expiresAt
  });
  active.set(request.citizenId, remaining);
  activeById.set(consentId, { rp: request.rp, caseId: request.caseId, citizenId: request.citizenId });
  scheduleRevoke(consentId, expiresAtMs);
  res.json({
    id: consentId,
    rp: request.rp,
    citizenId: request.citizenId,
    caseId: request.caseId,
    scopes: request.scopes,
    ttlMinutes,
    grantedAt: evt.issuedAt,
    expiresAt: evt.expiresAt
  });
});

app.post('/api/grant', async (req, res) => {
  const { rp = 'dwp', citizenId, caseId, scopes = ['nhs.prescriptions'], ttlMinutes = 180 } = req.body || {};
  if (!citizenId || scopes.length === 0) {
    return res.status(400).json({ ok: false, error: 'citizenId and scopes required' });
  }
  const grantedAtMs = Date.now();
  const expiresAtMs = grantedAtMs + ttlMinutes * 60 * 1000;
  const consentId = uuid();
  const evt = {
    eventType: 'grant',
    consentId,
    rp,
    caseId,
    citizenId,
    scopes,
    issuedAt: new Date(grantedAtMs).toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString()
  };
  await producer.send({ topic: CONSENT_TOPIC, messages: [{ key: citizenId, value: JSON.stringify(evt) }] });
  const current = active.get(citizenId) || [];
  const remaining = current.filter((r) => !(r.caseId === caseId && r.rp === rp));
  remaining.push({ rp, caseId, citizenId, scopes, grantedAt: evt.issuedAt, expiresAt: evt.expiresAt });
  active.set(citizenId, remaining);
  activeById.set(consentId, { rp, caseId, citizenId });
  scheduleRevoke(consentId, expiresAtMs);
  res.json({
    id: consentId,
    rp,
    citizenId,
    caseId,
    scopes,
    ttlMinutes,
    grantedAt: evt.issuedAt,
    expiresAt: evt.expiresAt
  });
});

app.listen(4000, ()=>console.log('Consent API on :4000'));
