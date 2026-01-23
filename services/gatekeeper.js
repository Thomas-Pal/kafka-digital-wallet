import { CONSENT_TOPIC, groupId, RUN_ID } from './config.js';
import { createKafka, waitForBroker } from './lib/kafka.js';

const k = createKafka(`gatekeeper-${RUN_ID}`);
await waitForBroker(k);
const producer = k.producer();
await producer.connect();
console.log(`[gatekeeper][${RUN_ID}] connected to Kafka, waiting for consent + RAW...`);

// key: "citizen|rp|scope" -> { citizenId, rp, scope, caseId, active, expiresAt }
const consentStore = new Map();
const seenRaw = new Set();
const keyFor = (citizenId, rp, scope) => `${citizenId}|${rp}|${scope}`;

const setConsent = ({ citizenId, rp, scope, caseId, active, expiresAt }) => {
  consentStore.set(keyFor(citizenId, rp, scope), {
    citizenId,
    rp,
    scope,
    caseId,
    active,
    expiresAt
  });
};

const hasConsent = (citizenId, rp, scope) => {
  const entry = consentStore.get(keyFor(citizenId, rp, scope));
  if (!entry || !entry.active) return false;
  if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) return false;
  return entry;
};

// consume consent
const consent = k.consumer({ groupId: groupId('gatekeeper-consent') });
await consent.connect();
await consent.subscribe({ topic: CONSENT_TOPIC, fromBeginning: true });
consent.run({
  eachMessage: async ({ message }) => {
    const evt = JSON.parse(message.value.toString());
    const { rp = 'dwp', caseId, citizenId, scope, expiresAt } = evt;

    if (evt.eventType === 'granted') {
      setConsent({ citizenId, rp, scope, caseId, active: true, expiresAt });
      console.log('[consent] grant', citizenId, rp, scope, caseId);
      return;
    }

    if (evt.eventType === 'revoked') {
      setConsent({ citizenId, rp, scope, caseId, active: false, expiresAt: expiresAt || new Date(0).toISOString() });
      console.log('[consent] revoke', citizenId, rp, scope, caseId);
      return;
    }

    if (evt.eventType === 'requested') {
      console.log('[consent] request', citizenId, rp, scope, caseId);
    }
  }
});

// consume RAW and forward if permitted
const rawTopics = [
  'nhs.prescriptions',
  'employment.termination',
  'hmrc.p45.summary'
];
const raw = k.consumer({ groupId: groupId('gatekeeper-raw') });
await raw.connect();
for (const topic of rawTopics) {
  await raw.subscribe({ topic, fromBeginning: false });
}

raw.run({
  eachMessage: async ({ topic, message }) => {
    const evt = JSON.parse(message.value.toString());
    const citizenId = evt.citizenId;
    if (!citizenId) return;
    const rawSignature = evt.eventId || `${topic}|${citizenId}|${JSON.stringify(evt)}`;
    if (seenRaw.has(rawSignature)) {
      return;
    }
    seenRaw.add(rawSignature);

    if (topic === 'employment.termination') {
      const dwpConsent = hasConsent(citizenId, 'dwp', 'share:dwp:uc');
      if (dwpConsent) {
        await producer.send({
          topic: 'views.permitted.dwp.uc',
          messages: [{
            key: citizenId,
            value: JSON.stringify({
              citizenId,
              caseId: dwpConsent.caseId || 'uc-9001',
              source: 'employment',
              payload: {
                terminationDate: evt.terminationDate,
                reasonCode: evt.reasonCode,
                weeklyHours: evt.weeklyHours,
                annualSalary: evt.annualSalary,
                employerId: evt.employerId
              },
              emittedAt: new Date().toISOString()
            })
          }]
        });
      }

      const coachConsent = hasConsent(citizenId, 'coach', 'share:coach:basic');
      if (coachConsent) {
        await producer.send({
          topic: 'views.permitted.coach.basic',
          messages: [{
            key: citizenId,
            value: JSON.stringify({
              citizenId,
              source: 'employment',
              payload: {
                reasonCode: evt.reasonCode,
                terminationDate: evt.terminationDate
              },
              emittedAt: new Date().toISOString()
            })
          }]
        });
      }
      return;
    }

    if (topic === 'hmrc.p45.summary') {
      const dwpConsent = hasConsent(citizenId, 'dwp', 'share:dwp:uc');
      if (!dwpConsent) return;
      await producer.send({
        topic: 'views.permitted.dwp.uc',
        messages: [{
          key: citizenId,
          value: JSON.stringify({
            citizenId,
            caseId: dwpConsent.caseId || 'uc-9001',
            source: 'hmrc',
            payload: {
              p45Number: evt.p45Number,
              taxCode: evt.taxCode,
              ytdGross: evt.ytdGross,
              ytdTax: evt.ytdTax,
              issuedAt: evt.issuedAt
            },
            emittedAt: new Date().toISOString()
          })
        }]
      });
      return;
    }

    if (topic === 'nhs.prescriptions') {
      const dwpConsent = hasConsent(citizenId, 'dwp', 'share:dwp:disability');
      const nhsConsent = hasConsent(citizenId, 'dwp', 'share:nhs:prescriptions');
      if (!dwpConsent || !nhsConsent) return;
      await producer.send({
        topic: 'views.permitted.dwp.disability',
        messages: [{
          key: citizenId,
          value: JSON.stringify({
            citizenId,
            caseId: dwpConsent.caseId || 'dis-9002',
            source: 'nhs',
            payload: {
              drug: evt.drug,
              dosage: evt.dosage,
              frequency: evt.frequency,
              prescribedAt: evt.prescribedAt,
              gpOdsCode: evt.gpOdsCode,
              repeat: evt.repeat
            },
            emittedAt: new Date().toISOString()
          })
        }]
      });
    }
  }
});
