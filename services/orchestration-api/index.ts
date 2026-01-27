import express from 'express';
import { v4 as uuid } from 'uuid';
import { allowAll } from '../shared/utils/cors.js';
import { createProducer } from '../shared/kafka/client.js';
import { assertConsentEvent, assertEmploymentTermination, assertPrescription } from '../shared/validators.js';

const app = express();
app.use(express.json());
app.use(allowAll);

const debug = (...args: unknown[]) => {
  if (process.env.DEBUG === '1') {
    console.log(...args);
  }
};

type ConsentRecord = {
  id: string;
  citizenId: string;
  grantedTo: string;
  scopes: string[];
  ttlDays: number;
  issuedAt: string;
  expiresAt: string;
  caseId?: string;
};

type AuditEntry = {
  id: string;
  action: string;
  grantedTo: string;
  scopes: string[];
  at: string;
  detail?: string;
};

type PendingConsent = {
  id: string;
  citizenId: string;
  rp: string;
  scopes: string[];
  requestedAt: string;
};

const pending = new Map<string, PendingConsent>();
const active = new Map<string, ConsentRecord>();
const audit: AuditEntry[] = [];

const producer = createProducer();
await producer.connect();

const sendEvent = async ({ topic, key, value, eventId }: { topic: string; key: string; value: unknown; eventId: string }) => {
  await producer.send({
    topic,
    messages: [
      {
        key,
        value: JSON.stringify(value),
        headers: { 'x-event-id': eventId },
      },
    ],
  });
};

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.get('/consent/pending', (_req, res) => {
  res.json(Array.from(pending.values()));
});

app.get('/consent/active', (_req, res) => {
  res.json(Array.from(active.values()));
});

app.get('/consent/audit', (_req, res) => {
  res.json(audit.slice().reverse());
});

app.post('/consent/request', (req, res) => {
  const { citizenId, rp, grantedTo, scopes } = req.body || {};
  const scopeList = Array.isArray(scopes) ? scopes : scopes ? [scopes] : [];
  const relyingParty = rp || grantedTo;
  if (!citizenId || !relyingParty || scopeList.length === 0) {
    return res.status(400).json({ ok: false, error: 'citizenId, rp, and scopes required' });
  }

  const requestId = uuid();
  const request: PendingConsent = {
    id: requestId,
    citizenId,
    rp: relyingParty,
    scopes: scopeList,
    requestedAt: new Date().toISOString(),
  };
  pending.set(requestId, request);
  return res.json({ ok: true, request });
});

app.post('/consent/grant', async (req, res) => {
  const {
    citizenId,
    grantedTo = 'dwp',
    rp,
    scopes,
    ttlDays = 90,
    caseId,
    pendingId,
    eventId: bodyEventId,
  } = req.body || {};
  const scopeList = Array.isArray(scopes) ? scopes : scopes ? [scopes] : [];
  const relyingParty = rp || grantedTo;
  if (!citizenId || scopeList.length === 0) {
    return res.status(400).json({ ok: false, error: 'citizenId and scopes required' });
  }

  const eventId = bodyEventId || uuid();
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();
  const consentId = uuid();

  const consent: ConsentRecord = {
    id: consentId,
    citizenId,
    grantedTo: relyingParty,
    scopes: scopeList,
    ttlDays,
    issuedAt,
    expiresAt,
    caseId,
  };

  const consentEvent = {
    eventId,
    type: 'grant',
    citizenId,
    grantedTo: relyingParty,
    scopes: scopeList,
    caseId,
    ttlDays,
    issuedAt,
  };

  try {
    assertConsentEvent(consentEvent);
    await sendEvent({ topic: 'consent.events', key: citizenId, value: consentEvent, eventId });
    active.set(consentId, consent);
    if (pendingId) {
      pending.delete(pendingId);
    }
    audit.push({
      id: uuid(),
      action: 'consent.granted',
      grantedTo: relyingParty,
      scopes: scopeList,
      at: issuedAt,
      detail: `Granted for ${ttlDays} days`,
    });
    debug('[orchestration] consent grant', eventId);
    return res.json({ ok: true, consent });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error instanceof Error ? error.message : 'invalid payload' });
  }
});

app.post('/consent/revoke', async (req, res) => {
  const { consentId, eventId: bodyEventId } = req.body || {};
  if (!consentId) {
    return res.status(400).json({ ok: false, error: 'consentId required' });
  }

  const consent = active.get(consentId);
  if (!consent) {
    return res.status(404).json({ ok: false, error: 'consent not found' });
  }

  const eventId = bodyEventId || uuid();
  const issuedAt = new Date().toISOString();
  const revokeEvent = {
    eventId,
    type: 'revoke',
    citizenId: consent.citizenId,
    grantedTo: consent.grantedTo,
    scopes: consent.scopes,
    caseId: consent.caseId,
    ttlDays: consent.ttlDays,
    issuedAt,
  };

  try {
    assertConsentEvent(revokeEvent);
    await sendEvent({ topic: 'consent.events', key: consent.citizenId, value: revokeEvent, eventId });
    active.delete(consentId);
    audit.push({
      id: uuid(),
      action: 'consent.revoked',
      grantedTo: consent.grantedTo,
      scopes: consent.scopes,
      at: issuedAt,
      detail: 'Citizen revoked consent',
    });
    debug('[orchestration] consent revoke', eventId);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error instanceof Error ? error.message : 'invalid payload' });
  }
});

app.post('/triggers/employment-termination', async (req, res) => {
  const eventId = req.body?.eventId || uuid();
  const payload = { eventId, ...(req.body || {}) };

  try {
    assertEmploymentTermination(payload);
    await sendEvent({ topic: 'employment.termination', key: payload.citizenId, value: payload, eventId });
    debug('[orchestration] publish employment.termination', eventId);
    return res.json({ ok: true, eventId, payload });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error instanceof Error ? error.message : 'invalid payload' });
  }
});

app.post('/triggers/nhs-prescription', async (req, res) => {
  const eventId = req.body?.eventId || uuid();
  const payload = { eventId, ...(req.body || {}) };

  try {
    assertPrescription(payload);
    await sendEvent({ topic: 'nhs.prescriptions', key: payload.citizenId, value: payload, eventId });
    debug('[orchestration] publish nhs.prescriptions', eventId);
    return res.json({ ok: true, eventId, payload });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error instanceof Error ? error.message : 'invalid payload' });
  }
});

app.listen(4000, () => {
  debug('Orchestration API listening on :4000');
});
