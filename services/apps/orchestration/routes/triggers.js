import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { TerminationEvent, PrescriptionEvent } from '../schemas.js';

export function createTriggersRouter({ sendEvent, idemCache }) {
  const router = Router();

  router.post('/employment-termination', async (req, res) => {
    const { eventId: bodyEventId } = req.body || {};
    const eventId = bodyEventId || uuid();
    const idempotencyKey = req.get('Idempotency-Key') || eventId;
    if (idemCache.has(idempotencyKey)) {
      return res.json({ ok: true, deduped: true, eventId });
    }
    idemCache.set(idempotencyKey);

    const evt = TerminationEvent({ eventId, ...(req.body || {}) });
    await sendEvent({ topic: 'employment.termination', key: evt.citizenId, value: evt, eventId });
    console.log(`[orchestration] publish employment.termination ${eventId}`);
    res.json({ ok: true, eventId, evt });
  });

  router.post('/nhs-prescription', async (req, res) => {
    const { eventId: bodyEventId } = req.body || {};
    const eventId = bodyEventId || uuid();
    const idempotencyKey = req.get('Idempotency-Key') || eventId;
    if (idemCache.has(idempotencyKey)) {
      return res.json({ ok: true, deduped: true, eventId });
    }
    idemCache.set(idempotencyKey);

    const evt = PrescriptionEvent({ eventId, ...(req.body || {}) });
    await sendEvent({ topic: 'nhs.prescriptions', key: evt.citizenId, value: evt, eventId });
    console.log(`[orchestration] publish nhs.prescriptions ${eventId}`);
    res.json({ ok: true, eventId, evt });
  });

  return router;
}
