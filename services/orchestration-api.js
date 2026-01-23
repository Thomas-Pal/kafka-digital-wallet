import express from 'express';
import { v4 as uuid } from 'uuid';
import { CONSENT_TOPIC, groupId, RUN_ID } from './config.js';
import { createKafka, waitForBroker } from './lib/kafka.js';
import { allowAll } from './utils/cors.js';
import { PrescriptionEvent, TerminationEvent, P45SummaryEvent } from './schemas.js';

const app = express();
app.use(express.json());
app.use(allowAll);

const kafka = createKafka(`orchestration-api-${RUN_ID}`);
await waitForBroker(kafka);
const producer = kafka.producer();
await producer.connect();

const pending = new Map(); // requestId -> request
const active = new Map(); // consentId -> consent

function emitConsentEvent(event) {
  return producer.send({
    topic: CONSENT_TOPIC,
    messages: [{ key: event.consentId, value: JSON.stringify(event) }]
  });
}

function normalizeScopes(scopes) {
  if (!scopes) return [];
  return Array.isArray(scopes) ? scopes : [scopes];
}

app.get('/api/requests', (_req, res) => {
  res.json(Array.from(pending.values()));
});

app.get('/api/consents', (_req, res) => {
  res.json(Array.from(active.values()));
});

app.post('/consents/request', async (req, res) => {
  const { rp = 'dwp', citizenId, caseId, scopes, reason } = req.body || {};
  if (!citizenId || !scopes) return res.status(400).json({ ok: false, error: 'citizenId and scopes required' });
  const issuedAt = new Date().toISOString();
  const requestId = uuid();
  const scopeList = normalizeScopes(scopes);
  const request = { id: requestId, rp, citizenId, caseId, scopes: scopeList, reason, issuedAt };
  pending.set(requestId, request);
  await Promise.all(scopeList.map((scope) => emitConsentEvent({
    eventType: 'requested',
    consentId: requestId,
    citizenId,
    rp,
    scope,
    caseId,
    issuedAt,
    expiresAt: null,
    grantedBy: null
  })));
  res.json({ ok: true, request });
});

app.post('/api/request', async (req, res) => {
  const { rp = 'dwp', citizenId, caseId, scopes, reason } = req.body || {};
  if (!citizenId || !scopes) return res.status(400).json({ ok: false, error: 'citizenId and scopes required' });
  const issuedAt = new Date().toISOString();
  const requestId = uuid();
  const scopeList = normalizeScopes(scopes);
  const request = { id: requestId, rp, citizenId, caseId, scopes: scopeList, reason, issuedAt };
  pending.set(requestId, request);
  await Promise.all(scopeList.map((scope) => emitConsentEvent({
    eventType: 'requested',
    consentId: requestId,
    citizenId,
    rp,
    scope,
    caseId,
    issuedAt,
    expiresAt: null,
    grantedBy: null
  })));
  res.json({ ok: true, request });
});

app.post('/consents/grant', async (req, res) => {
  const { rp = 'dwp', citizenId, caseId, scopes, ttlMinutes = 180, grantedBy = 'citizen' } = req.body || {};
  if (!citizenId || !scopes) return res.status(400).json({ ok: false, error: 'citizenId and scopes required' });
  const scopeList = normalizeScopes(scopes);
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

  const entries = scopeList.map((scope) => {
    const consentId = uuid();
    const consent = { id: consentId, rp, citizenId, caseId, scopes: [scope], ttlMinutes, grantedAt: issuedAt, expiresAt };
    active.set(consentId, consent);
    return { consentId, scope };
  });

  await Promise.all(entries.map(({ consentId, scope }) => emitConsentEvent({
    eventType: 'granted',
    consentId,
    citizenId,
    rp,
    scope,
    caseId,
    issuedAt,
    expiresAt,
    grantedBy
  })));

  res.json({ ok: true, consents: entries.map(({ consentId, scope }) => ({
    id: consentId,
    rp,
    citizenId,
    caseId,
    scopes: [scope],
    ttlMinutes,
    grantedAt: issuedAt,
    expiresAt
  })) });
});

app.post('/api/grant', async (req, res) => {
  const { rp = 'dwp', citizenId, caseId, scopes, ttlMinutes = 180 } = req.body || {};
  if (!citizenId || !scopes) return res.status(400).json({ ok: false, error: 'citizenId and scopes required' });
  const scopeList = normalizeScopes(scopes);
  const grantedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

  const entries = scopeList.map((scope) => {
    const consentId = uuid();
    const consent = { id: consentId, rp, citizenId, caseId, scopes: [scope], ttlMinutes, grantedAt, expiresAt };
    active.set(consentId, consent);
    return { consentId, scope };
  });

  await Promise.all(entries.map(({ consentId, scope }) => emitConsentEvent({
    eventType: 'granted',
    consentId,
    citizenId,
    rp,
    scope,
    caseId,
    issuedAt: grantedAt,
    expiresAt,
    grantedBy: 'citizen'
  })));

  res.json({ ok: true, consents: entries.map(({ consentId, scope }) => ({
    id: consentId,
    rp,
    citizenId,
    caseId,
    scopes: [scope],
    ttlMinutes,
    grantedAt,
    expiresAt
  })) });
});

app.post('/consents/revoke', async (req, res) => {
  const { consentId } = req.body || {};
  if (!consentId) return res.status(400).json({ ok: false, error: 'consentId required' });
  const consent = active.get(consentId);
  if (!consent) return res.status(404).json({ ok: false, error: 'consent not found' });
  active.delete(consentId);
  const at = new Date().toISOString();
  await Promise.all(consent.scopes.map((scope) => emitConsentEvent({
    eventType: 'revoked',
    consentId,
    citizenId: consent.citizenId,
    rp: consent.rp,
    scope,
    caseId: consent.caseId,
    issuedAt: at,
    expiresAt: consent.expiresAt,
    grantedBy: consent.grantedBy || 'citizen'
  })));
  res.json({ ok: true });
});

app.post('/api/approve', async (req, res) => {
  const { requestId, ttlMinutes = 180 } = req.body || {};
  const request = pending.get(requestId);
  if (!request) return res.status(404).json({ ok: false, error: 'request not found' });
  pending.delete(requestId);
  const grantedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

  const entries = request.scopes.map((scope) => {
    const consentId = uuid();
    const consent = { id: consentId, rp: request.rp, citizenId: request.citizenId, caseId: request.caseId, scopes: [scope], ttlMinutes, grantedAt, expiresAt };
    active.set(consentId, consent);
    return { consentId, scope };
  });

  await Promise.all(entries.map(({ consentId, scope }) => emitConsentEvent({
    eventType: 'granted',
    consentId,
    citizenId: request.citizenId,
    rp: request.rp,
    scope,
    caseId: request.caseId,
    issuedAt: grantedAt,
    expiresAt,
    grantedBy: 'citizen'
  })));

  res.json({ ok: true });
});

app.post('/triggers/employment-termination', async (req, res) => {
  const eventId = uuid();
  const evt = TerminationEvent({ eventId, ...(req.body || {}) });
  await producer.send({ topic: 'employment.termination', messages: [{ key: evt.citizenId, value: JSON.stringify(evt) }] });
  res.json({ ok: true, evt });
});

app.post('/triggers/prescription-change', async (req, res) => {
  const eventId = uuid();
  const evt = PrescriptionEvent({ eventId, ...(req.body || {}) });
  await producer.send({ topic: 'nhs.prescriptions', messages: [{ key: evt.citizenId, value: JSON.stringify(evt) }] });
  res.json({ ok: true, evt });
});

app.post('/triggers/p45', async (req, res) => {
  const eventId = uuid();
  const evt = P45SummaryEvent({ eventId, ...(req.body || {}) });
  await producer.send({ topic: 'hmrc.p45.summary', messages: [{ key: evt.citizenId, value: JSON.stringify(evt) }] });
  res.json({ ok: true, evt });
});

app.listen(4000, () => console.log('Orchestration API on :4000'));
