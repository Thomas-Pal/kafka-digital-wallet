import { CONSENT_TOPIC, groupId, RUN_ID } from './config.js';
import { createKafka, waitForBroker } from './lib/kafka.js';

const k = createKafka(`gatekeeper-${RUN_ID}`);
await waitForBroker(k);
const producer = k.producer();
await producer.connect();
console.log(`[gatekeeper][${RUN_ID}] connected to Kafka, waiting for consent + RAW...`);

// key: "citizen|rp|scope|case" -> { citizenId, rp, scope, caseId, active, expiresAt }
const consentStore = new Map();
const consentsByCitizen = new Map();
const keyFor = (citizenId, rp, scope, caseId) => `${citizenId}|${rp}|${scope}|${caseId}`;
const indexConsent = (citizenId, key) => {
  const set = consentsByCitizen.get(citizenId) || new Set();
  set.add(key);
  consentsByCitizen.set(citizenId, set);
};

const findConsents = (citizenId, rp, scope) => {
  const keys = Array.from(consentsByCitizen.get(citizenId) || []);
  const now = Date.now();
  return keys
    .map((k) => consentStore.get(k))
    .filter(Boolean)
    .filter((c) => c.rp === rp && c.scope === scope)
    .filter((c) => c.active)
    .filter((c) => !c.expiresAt || new Date(c.expiresAt).getTime() >= now);
};

// consume consent
const consent = k.consumer({ groupId: groupId('gatekeeper-consent') });
await consent.connect();
await consent.subscribe({ topic: CONSENT_TOPIC, fromBeginning: true });
consent.run({
  eachMessage: async ({ message }) => {
    const evt = JSON.parse(message.value.toString());
    const { rp = 'dwp', caseId, citizenId, scopes = [], expiresAt } = evt;

    if (evt.eventType === 'grant') {
      scopes.forEach((scope) => {
        const key = keyFor(citizenId, rp, scope, caseId);
        consentStore.set(key, { citizenId, rp, scope, caseId, active: true, expiresAt });
        indexConsent(citizenId, key);
      });
      console.log('[consent] grant', citizenId, caseId, scopes);
      return;
    }

    if (evt.eventType === 'revoke') {
      const keys = Array.from(consentsByCitizen.get(citizenId) || []);
      keys.forEach((key) => {
        const c = consentStore.get(key);
        if (!c || c.rp !== rp || c.caseId !== caseId) return;
        consentStore.set(key, { ...c, active: false, expiresAt: expiresAt || new Date(0).toISOString() });
      });
      console.log('[consent] revoke', citizenId, caseId);
      return;
    }

    if (evt.eventType === 'request') {
      console.log('[consent] request', citizenId, caseId);
    }
  }
});

// consume RAW and forward if permitted
const rawTopics = [
  'nhs.raw.prescriptions',
  'employment.termination',
  'hmrc.p45.summary'
];
const raw = k.consumer({ groupId: groupId('gatekeeper-raw') });
await raw.connect();
for (const topic of rawTopics) {
  await raw.subscribe({ topic, fromBeginning: true });
}

raw.run({
  eachMessage: async ({ topic, message }) => {
    const evt = JSON.parse(message.value.toString());
    const citizenId = evt.citizenId || evt.patientId || evt.personId;
    if (!citizenId) return;

    const scope =
      topic === 'nhs.raw.prescriptions'
        ? 'nhs.prescriptions'
        : 'employment.termination';

    const candidates = findConsents(citizenId, 'dwp', scope);
    if (candidates.length === 0) {
      console.log('[drop] no consent for', citizenId);
      return;
    }

    for (const c of candidates) {
      const viewTopic = `views.permitted.dwp.${c.caseId}.${scope}`;
      await producer.send({
        topic: viewTopic,
        messages: [{
          key: citizenId,
          value: JSON.stringify({
            caseId: c.caseId,
            rp: 'dwp',
            scope,
            citizenId,
            data: evt,
            routedAt: new Date().toISOString()
          })
        }]
      });
      console.log('[view]', viewTopic, '→', citizenId);
    }
  }
});
