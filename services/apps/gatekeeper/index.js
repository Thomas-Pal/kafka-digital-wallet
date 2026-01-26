import express from 'express';
import { createKafka, waitForBroker } from '../../shared/lib/kafka.js';

const kafka = createKafka('gatekeeper');
await waitForBroker(kafka);
const producer = kafka.producer();
await producer.connect();

const app = express();
app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.listen(5002, () => console.log('Gatekeeper healthz on :5002'));

const consentStore = new Map();
const latestPrescription = new Map();
const seenEvents = new Set();

const isDuplicate = (eventId) => {
  if (!eventId) return false;
  if (seenEvents.has(eventId)) return true;
  seenEvents.add(eventId);
  return false;
};

const consentKey = (citizenId, grantedTo, scope) => `${citizenId}|${grantedTo}|${scope}`;

const setConsent = (event) => {
  const expiresAt = new Date(new Date(event.issuedAt).getTime() + event.ttlDays * 24 * 60 * 60 * 1000).toISOString();
  for (const scope of event.scopes || []) {
    consentStore.set(consentKey(event.citizenId, event.grantedTo, scope), {
      ...event,
      scopes: [scope],
      expiresAt,
    });
  }
};

const removeConsent = (event) => {
  for (const scope of event.scopes || []) {
    consentStore.delete(consentKey(event.citizenId, event.grantedTo, scope));
  }
};

const hasConsent = (citizenId, grantedTo, scope) => {
  const consent = consentStore.get(consentKey(citizenId, grantedTo, scope));
  if (!consent) return null;
  if (consent.expiresAt && new Date(consent.expiresAt) < new Date()) return null;
  return consent;
};

const consumer = kafka.consumer({ groupId: 'gatekeeper' });
await consumer.connect();
await consumer.subscribe({ topic: 'consent.events', fromBeginning: false });
await consumer.subscribe({ topic: 'employment.termination', fromBeginning: false });
await consumer.subscribe({ topic: 'nhs.prescriptions', fromBeginning: false });

console.log('[gatekeeper] ready to process consent and RAW events');

await consumer.run({
  eachMessage: async ({ topic, message }) => {
    const eventId = message.headers?.['x-event-id']?.toString();
    if (isDuplicate(eventId)) {
      return;
    }

    const payload = JSON.parse(message.value.toString());

    if (topic === 'consent.events') {
      if (payload.type === 'grant') {
        setConsent(payload);
        console.log(`[gatekeeper] consent grant ${payload.eventId}`);
      } else if (payload.type === 'revoke' || payload.type === 'expire') {
        removeConsent(payload);
        console.log(`[gatekeeper] consent revoke ${payload.eventId}`);
      }
      return;
    }

    if (topic === 'nhs.prescriptions') {
      latestPrescription.set(payload.citizenId, payload);
      const consent = hasConsent(payload.citizenId, 'dwp', 'nhs.prescriptions');
      if (!consent) return;
      const viewEvent = {
        eventId: payload.eventId,
        citizenId: payload.citizenId,
        caseId: consent.caseId,
        caseType: 'PIP',
        evidence: {
          health: {
            drug: payload.drug,
            dosage: payload.dosage,
            frequency: payload.frequency,
            repeat: payload.repeat,
            gpOdsCode: payload.gpOdsCode,
            condition: payload.condition,
            prescribedAt: payload.prescribedAt,
          },
        },
        reason: 'nhs.prescriptions',
        grantedAt: consent.issuedAt,
      };

      await producer.send({
        topic: 'views.permitted.dwp.pip',
        messages: [
          {
            key: payload.citizenId,
            value: JSON.stringify(viewEvent),
            headers: { 'x-event-id': payload.eventId },
          },
        ],
      });
      console.log(`[gatekeeper] view emitted ${payload.eventId} -> dwp.pip`);
      return;
    }

    if (topic === 'employment.termination') {
      const consent = hasConsent(payload.citizenId, 'dwp', 'employment.termination');
      if (!consent) return;
      const healthConsent = hasConsent(payload.citizenId, 'dwp', 'nhs.prescriptions');
      const health = healthConsent ? latestPrescription.get(payload.citizenId) : null;

      const viewEvent = {
        eventId: payload.eventId,
        citizenId: payload.citizenId,
        caseId: consent.caseId,
        caseType: 'UC',
        evidence: {
          employment: {
            employerName: payload.employerName,
            employerId: payload.employerId,
            niNumber: payload.niNumber,
            terminationDate: payload.terminationDate,
            reasonCode: payload.reasonCode,
            weeklyHours: payload.weeklyHours,
            annualSalary: payload.annualSalary,
            noticePaid: payload.noticePaid,
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
            key: payload.citizenId,
            value: JSON.stringify(viewEvent),
            headers: { 'x-event-id': payload.eventId },
          },
        ],
      });
      console.log(`[gatekeeper] view emitted ${payload.eventId} -> dwp.uc`);
    }
  },
});
