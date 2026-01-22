import { CONSENT_TOPIC, groupId, RUN_ID } from './config.js';
import { createKafka, waitForBroker, viewTopic } from './lib/kafka.js';

const k = createKafka(`gatekeeper-${RUN_ID}`);
await waitForBroker(k);
const producer = k.producer();
await producer.connect();
console.log(`[gatekeeper][${RUN_ID}] connected to Kafka, waiting for consent + RAW...`);

// key: "rp|case|citizen" -> { active, scopes:Set, expiresAt }
const consentStore = new Map();
const casesByCitizen = new Map();
const keyFor = (rp, caseId, citizenId) => `${rp}|${caseId}|${citizenId}`;
const indexCitizen = (key, citizenId) => {
  const set = casesByCitizen.get(citizenId) || new Set();
  set.add(key);
  casesByCitizen.set(citizenId, set);
};

// consume consent
const consent = k.consumer({ groupId: groupId('gatekeeper-consent') });
await consent.connect();
await consent.subscribe({ topic: CONSENT_TOPIC, fromBeginning: true });
consent.run({
  eachMessage: async ({ message }) => {
    const evt = JSON.parse(message.value.toString());
    const { rp = 'dwp', caseId, citizenId, scopes = [], expiresAt } = evt;
    const key = keyFor(rp, caseId, citizenId);

    if (evt.eventType === 'grant') {
      consentStore.set(key, { active: true, scopes: new Set(scopes), expiresAt });
      indexCitizen(key, citizenId);
      console.log('[consent] grant', key);
    } else if (evt.eventType === 'revoke') {
      consentStore.set(key, { active: false, scopes: new Set(), expiresAt: expiresAt || new Date(0).toISOString() });
      indexCitizen(key, citizenId);
      console.log('[consent] revoke', key);
    } else if (evt.eventType === 'request') {
      console.log('[consent] request', key);
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
    const e = JSON.parse(message.value.toString());
    const citizenId = e.patientId || e.citizenId || e.personId;
    const keys = Array.from(casesByCitizen.get(citizenId) || []);
    if (keys.length === 0) {
      console.log('[drop] no consent for', citizenId);
      return;
    }

    const requiredScope =
      topic === 'nhs.raw.prescriptions'
        ? 'nhs.prescriptions'
        : topic === 'employment.termination'
          ? 'employment.termination'
          : 'hmrc.p45.summary';

    for (const k of keys) {
      const c = consentStore.get(k);
      const [, caseId, consentCitizenId] = k.split('|');
      if (!c) { console.log('[drop] no consent for', citizenId); continue; }
      if (!c.active) { console.log('[drop] inactive consent', k); continue; }
      if (c.expiresAt && new Date(c.expiresAt) < new Date()) { console.log('[drop] expired', k); continue; }
      if (!c.scopes.has(requiredScope)) { console.log('[drop] scope miss', k, [...c.scopes]); continue; }
      if (consentCitizenId !== citizenId) { console.log('[drop] no consent for', citizenId); continue; }

      const view = viewTopic(caseId, consentCitizenId);
      const rp = 'dwp';
      const payload =
        topic === 'nhs.raw.prescriptions'
          ? { citizenId: consentCitizenId, rp, caseId, prescription: e.prescription, at: new Date().toISOString() }
          : { citizenId: consentCitizenId, rp, caseId, event: e, at: new Date().toISOString() };
      await producer.send({
        topic: view,
        messages: [{ key: consentCitizenId, value: JSON.stringify(payload) }]
      });
      console.log('[view]', view, '→', citizenId);
    }
  }
});
