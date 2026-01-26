import { Router } from 'express';
import { v4 as uuid } from 'uuid';

export function createConsentRouter({ pending, active, audit, sendEvent, idemCache }) {
  const router = Router();

  router.get('/pending', (_req, res) => {
    res.json(Array.from(pending.values()));
  });

  router.get('/active', (_req, res) => {
    res.json(Array.from(active.values()));
  });

  router.get('/audit', (_req, res) => {
    res.json(audit.slice().reverse());
  });

  router.post('/audit', (req, res) => {
    const entry = {
      id: uuid(),
      action: req.body?.action || 'viewed',
      grantedTo: req.body?.grantedTo || 'dwp',
      scopes: req.body?.scopes || [],
      at: new Date().toISOString(),
      detail: req.body?.detail,
    };
    audit.push(entry);
    res.json({ ok: true, entry });
  });

  router.post('/request', (req, res) => {
    const { citizenId, grantedTo = 'dwp', scopes, caseId, purpose, eventId } = req.body || {};
    if (!citizenId || !scopes) {
      return res.status(400).json({ ok: false, error: 'citizenId and scopes required' });
    }
    const idempotencyKey = req.get('Idempotency-Key') || eventId;
    if (idemCache.has(idempotencyKey)) {
      return res.json({ ok: true, deduped: true });
    }
    idemCache.set(idempotencyKey);

    const requestId = uuid();
    const request = {
      id: requestId,
      citizenId,
      grantedTo,
      scopes: Array.isArray(scopes) ? scopes : [scopes],
      caseId,
      purpose,
      requestedAt: new Date().toISOString(),
    };
    pending.set(requestId, request);
    audit.push({
      id: uuid(),
      action: 'consent.requested',
      grantedTo,
      scopes: request.scopes,
      at: request.requestedAt,
      detail: purpose,
    });
    res.json({ ok: true, request });
  });

  router.post('/grant', async (req, res) => {
    const { citizenId, grantedTo = 'dwp', scopes, caseId, ttlDays = 90, requestId, eventId } = req.body || {};
    if (!requestId && (!citizenId || !scopes)) {
      return res.status(400).json({ ok: false, error: 'citizenId (or requestId) and scopes required' });
    }

    const idempotencyKey = req.get('Idempotency-Key') || eventId;
    if (idemCache.has(idempotencyKey)) {
      return res.json({ ok: true, deduped: true });
    }
    idemCache.set(idempotencyKey);

    let sourceCitizenId = citizenId;
    let sourceScopes = Array.isArray(scopes) ? scopes : scopes ? [scopes] : [];
    let sourceCaseId = caseId;
    let sourceGrantedTo = grantedTo;

    if (requestId && pending.has(requestId)) {
      const reqRecord = pending.get(requestId);
      pending.delete(requestId);
      sourceCitizenId = reqRecord.citizenId;
      sourceScopes = reqRecord.scopes;
      sourceCaseId = reqRecord.caseId;
      sourceGrantedTo = reqRecord.grantedTo;
    }

    const issuedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();
    const consentId = uuid();

    const consent = {
      id: consentId,
      citizenId: sourceCitizenId,
      grantedTo: sourceGrantedTo,
      scopes: sourceScopes,
      ttlDays,
      issuedAt,
      expiresAt,
      caseId: sourceCaseId,
    };
    active.set(consentId, consent);

    const payload = {
      eventId: eventId || uuid(),
      type: 'grant',
      citizenId: sourceCitizenId,
      grantedTo: sourceGrantedTo,
      scopes: sourceScopes,
      caseId: sourceCaseId,
      ttlDays,
      issuedAt,
    };

    await sendEvent({
      topic: 'consent.events',
      key: sourceCitizenId,
      value: payload,
      eventId: payload.eventId,
    });

    audit.push({
      id: uuid(),
      action: 'consent.granted',
      grantedTo: sourceGrantedTo,
      scopes: sourceScopes,
      at: issuedAt,
      detail: `Granted for ${ttlDays} days`,
    });

    console.log(`[orchestration] consent grant ${payload.eventId}`);
    res.json({ ok: true, consent });
  });

  router.post('/revoke', async (req, res) => {
    const { consentId, eventId } = req.body || {};
    if (!consentId) {
      return res.status(400).json({ ok: false, error: 'consentId required' });
    }
    const idempotencyKey = req.get('Idempotency-Key') || eventId;
    if (idemCache.has(idempotencyKey)) {
      return res.json({ ok: true, deduped: true });
    }
    idemCache.set(idempotencyKey);

    const consent = active.get(consentId);
    if (!consent) {
      return res.status(404).json({ ok: false, error: 'consent not found' });
    }
    active.delete(consentId);
    const issuedAt = new Date().toISOString();
    const payload = {
      eventId: eventId || uuid(),
      type: 'revoke',
      citizenId: consent.citizenId,
      grantedTo: consent.grantedTo,
      scopes: consent.scopes,
      caseId: consent.caseId,
      ttlDays: consent.ttlDays,
      issuedAt,
    };

    await sendEvent({
      topic: 'consent.events',
      key: consent.citizenId,
      value: payload,
      eventId: payload.eventId,
    });

    audit.push({
      id: uuid(),
      action: 'consent.revoked',
      grantedTo: consent.grantedTo,
      scopes: consent.scopes,
      at: issuedAt,
      detail: 'Citizen revoked consent',
    });

    console.log(`[orchestration] consent revoke ${payload.eventId}`);
    res.json({ ok: true });
  });

  router.post('/deny', (req, res) => {
    const { requestId, eventId } = req.body || {};
    if (!requestId) {
      return res.status(400).json({ ok: false, error: 'requestId required' });
    }
    const idempotencyKey = req.get('Idempotency-Key') || eventId;
    if (idemCache.has(idempotencyKey)) {
      return res.json({ ok: true, deduped: true });
    }
    idemCache.set(idempotencyKey);

    const request = pending.get(requestId);
    if (!request) {
      return res.status(404).json({ ok: false, error: 'request not found' });
    }
    pending.delete(requestId);
    audit.push({
      id: uuid(),
      action: 'consent.denied',
      grantedTo: request.grantedTo,
      scopes: request.scopes,
      at: new Date().toISOString(),
      detail: 'Citizen denied request',
    });
    res.json({ ok: true });
  });

  return router;
}
