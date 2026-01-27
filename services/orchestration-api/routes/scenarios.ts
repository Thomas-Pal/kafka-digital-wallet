import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { assertEmploymentTermination, assertPrescription } from '../../shared/validators.js';
import { pushNotification } from '../notifications.js';

type SendEvent = (input: {
  topic: string;
  key: string;
  value: unknown;
  eventId: string;
}) => Promise<void>;

type ConsentCheck = (input: {
  citizenId: string;
  grantedTo: string;
  scopes: string[];
}) => boolean;

type ConsentRequest = (input: {
  citizenId: string;
  rp: string;
  scopes: string[];
  purpose?: string;
  durationDays?: number;
  caseId?: string;
}) => string;

export function createScenariosRouter({
  sendEvent,
  hasActiveConsent,
  createConsentRequest,
}: {
  sendEvent: SendEvent;
  hasActiveConsent: ConsentCheck;
  createConsentRequest: ConsentRequest;
}) {
  const router = Router();

  router.post('/employment-termination', async (req, res) => {
    const citizenId = String(req.body?.citizenId || 'nhs-999');
    const eventId = uuid();
    const payload = {
      eventId,
      citizenId,
      niNumber: 'QQ 12 34 56 C',
      employerId: 'gb-emp-001',
      employerName: 'Northern Logistics Ltd',
      terminationDate: new Date().toISOString(),
      reasonCode: 'redundancy',
      weeklyHours: 37.5,
      annualSalary: 32000,
      noticePaid: true,
    };

    try {
      assertEmploymentTermination(payload);
      await sendEvent({ topic: 'employment.termination', key: citizenId, value: payload, eventId });
    } catch (error) {
      return res
        .status(400)
        .json({ ok: false, error: error instanceof Error ? error.message : 'invalid payload' });
    }

    const dwpScopes = ['employment.termination'];
    const dwpHasConsent = hasActiveConsent({ citizenId, grantedTo: 'dwp', scopes: dwpScopes });
    if (!dwpHasConsent) {
      const requestId = createConsentRequest({
        citizenId,
        rp: 'dwp',
        scopes: dwpScopes,
        purpose: 'Universal Credit eligibility after termination',
        durationDays: 90,
        caseId: `uc-${citizenId}`,
      });
      pushNotification({
        id: uuid(),
        citizenId,
        title: 'Employment change detected',
        body: 'Share employment status with DWP for 90 days to assess UC?',
        action: { label: 'Review request', href: `/consents?requestId=${requestId}` },
        createdAt: new Date().toISOString(),
      });
    }

    const coachScopes = ['employment.termination'];
    const coachHasConsent = hasActiveConsent({ citizenId, grantedTo: 'coach', scopes: coachScopes });
    if (!coachHasConsent) {
      const requestId = createConsentRequest({
        citizenId,
        rp: 'coach',
        scopes: coachScopes,
        purpose: 'Jobcentre support after termination',
        durationDays: 60,
      });
      pushNotification({
        id: uuid(),
        citizenId,
        title: 'Support offer available',
        body: 'Share employment status with your Jobcentre coach for tailored support.',
        action: { label: 'Review request', href: `/consents?requestId=${requestId}` },
        createdAt: new Date().toISOString(),
      });
    }

    return res.json({ ok: true, eventId });
  });

  router.post('/prescription-issued', async (req, res) => {
    const citizenId = String(req.body?.citizenId || 'nhs-999');
    const eventId = uuid();
    const payload = {
      eventId,
      citizenId,
      drug: 'Sumatriptan 50mg',
      dosage: '50mg',
      frequency: 'Twice daily',
      repeat: false,
      gpOdsCode: 'B83001',
      condition: 'Migraine',
      prescribedAt: new Date().toISOString(),
    };

    try {
      assertPrescription(payload);
      await sendEvent({ topic: 'nhs.prescriptions', key: citizenId, value: payload, eventId });
    } catch (error) {
      return res
        .status(400)
        .json({ ok: false, error: error instanceof Error ? error.message : 'invalid payload' });
    }

    const scopes = ['nhs.prescriptions'];
    const hasConsent = hasActiveConsent({ citizenId, grantedTo: 'dwp', scopes });
    if (!hasConsent) {
      const requestId = createConsentRequest({
        citizenId,
        rp: 'dwp',
        scopes,
        purpose: 'PIP evidence: prescriptions in last 12 months',
        durationDays: 90,
        caseId: `pip-${citizenId}`,
      });
      pushNotification({
        id: uuid(),
        citizenId,
        title: 'New prescription recorded',
        body: 'Share prescriptions (last 12 months) with DWP to support your PIP claim?',
        action: { label: 'Review request', href: `/consents?requestId=${requestId}` },
        createdAt: new Date().toISOString(),
      });
    }

    return res.json({ ok: true, eventId });
  });

  return router;
}
