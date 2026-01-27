import express from 'express';
import { v4 as uuid } from 'uuid';
import { createConsumer, createProducer } from '../shared/kafka/client.js';

const debug = (...args: unknown[]) => {
  if (process.env.DEBUG === '1') {
    console.log(...args);
  }
};

type ConsentSnapshot = {
  citizenId: string;
  grantedTo: string;
  scope: string;
  issuedAt: string;
  expiresAt?: string;
  caseId?: string;
};

type RawPrescription = {
  eventId: string;
  citizenId: string;
  drug: string;
  dosage: string;
  frequency: string;
  repeat: boolean;
  gpOdsCode: string;
  condition: string;
  prescribedAt: string;
};

type RawEmployment = {
  eventId: string;
  citizenId: string;
  niNumber: string;
  employerId: string;
  employerName: string;
  terminationDate: string;
  reasonCode: string;
  weeklyHours: number;
  annualSalary: number;
  noticePaid: boolean;
};

const consentStore = new Map<string, ConsentSnapshot>();
const latestPrescription = new Map<string, RawPrescription>();

const consentKey = (citizenId: string, grantedTo: string, scope: string) => `${citizenId}|${grantedTo}|${scope}`;

const setConsent = (event: { citizenId: string; grantedTo: string; scopes: string[]; issuedAt: string; ttlDays: number; caseId?: string }) => {
  const expiresAt = new Date(new Date(event.issuedAt).getTime() + event.ttlDays * 24 * 60 * 60 * 1000).toISOString();
  for (const scope of event.scopes || []) {
    consentStore.set(consentKey(event.citizenId, event.grantedTo, scope), {
      citizenId: event.citizenId,
      grantedTo: event.grantedTo,
      scope,
      issuedAt: event.issuedAt,
      expiresAt,
      caseId: event.caseId,
    });
  }
};

const removeConsent = (event: { citizenId: string; grantedTo: string; scopes: string[] }) => {
  for (const scope of event.scopes || []) {
    consentStore.delete(consentKey(event.citizenId, event.grantedTo, scope));
  }
};

const hasConsent = (citizenId: string, grantedTo: string, scope: string) => {
  const consent = consentStore.get(consentKey(citizenId, grantedTo, scope));
  if (!consent) return null;
  if (consent.expiresAt && new Date(consent.expiresAt) < new Date()) return null;
  return consent;
};

const app = express();
app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.listen(5002, () => {
  debug('Gatekeeper healthz on :5002');
});

const consumer = createConsumer('gatekeeper');
const producer = createProducer();
await producer.connect();
await consumer.connect();
await consumer.subscribe({ topic: 'consent.events', fromBeginning: false });
await consumer.subscribe({ topic: 'employment.termination', fromBeginning: false });
await consumer.subscribe({ topic: 'nhs.prescriptions', fromBeginning: false });

debug('[gatekeeper] ready to process consent and RAW events');

await consumer.run({
  eachMessage: async ({ topic, message }) => {
    const payload = JSON.parse(message.value?.toString() || '{}');

    if (topic === 'consent.events') {
      if (payload.type === 'grant') {
        setConsent(payload);
        debug('[gatekeeper] consent grant', payload.eventId);
      } else if (payload.type === 'revoke' || payload.type === 'expire') {
        removeConsent(payload);
        debug('[gatekeeper] consent revoke', payload.eventId);
      }
      return;
    }

    if (topic === 'nhs.prescriptions') {
      const event = payload as RawPrescription;
      latestPrescription.set(event.citizenId, event);
      const consent = hasConsent(event.citizenId, 'dwp', 'nhs.prescriptions');
      if (!consent) return;

      const viewEvent = {
        eventId: event.eventId || uuid(),
        citizenId: event.citizenId,
        caseId: consent.caseId || `pip-${event.citizenId}`,
        caseType: 'PIP',
        evidence: {
          health: {
            drug: event.drug,
            dosage: event.dosage,
            frequency: event.frequency,
            repeat: event.repeat,
            gpOdsCode: event.gpOdsCode,
            condition: event.condition,
            prescribedAt: event.prescribedAt,
          },
        },
        reason: 'nhs.prescriptions',
        grantedAt: consent.issuedAt,
      };

      await producer.send({
        topic: 'views.permitted.dwp.pip',
        messages: [
          {
            key: event.citizenId,
            value: JSON.stringify(viewEvent),
            headers: { 'x-event-id': viewEvent.eventId },
          },
        ],
      });
      debug('[gatekeeper] view emitted', viewEvent.eventId, '-> dwp.pip');
      return;
    }

    if (topic === 'employment.termination') {
      const event = payload as RawEmployment;
      const consent = hasConsent(event.citizenId, 'dwp', 'employment.termination');
      if (!consent) return;

      const healthConsent = hasConsent(event.citizenId, 'dwp', 'nhs.prescriptions');
      const health = healthConsent ? latestPrescription.get(event.citizenId) : null;

      const viewEvent = {
        eventId: event.eventId || uuid(),
        citizenId: event.citizenId,
        caseId: consent.caseId || `uc-${event.citizenId}`,
        caseType: 'UC',
        evidence: {
          employment: {
            employerName: event.employerName,
            employerId: event.employerId,
            niNumber: event.niNumber,
            terminationDate: event.terminationDate,
            reasonCode: event.reasonCode,
            weeklyHours: event.weeklyHours,
            annualSalary: event.annualSalary,
            noticePaid: event.noticePaid,
          },
          health: health
            ? {
                drug: health.drug,
                condition: health.condition,
                prescribedAt: health.prescribedAt,
              }
            : undefined,
        },
        reason: 'employment.termination',
        grantedAt: consent.issuedAt,
      };

      await producer.send({
        topic: 'views.permitted.dwp.uc',
        messages: [
          {
            key: event.citizenId,
            value: JSON.stringify(viewEvent),
            headers: { 'x-event-id': viewEvent.eventId },
          },
        ],
      });
      debug('[gatekeeper] view emitted', viewEvent.eventId, '-> dwp.uc');
    }
  },
});
