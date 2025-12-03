import { RAW_TOPIC, CONSENT_TOPIC, groupId, RUN_ID } from './config.js';
import { createKafka, viewTopic } from './lib/kafka.js';

const k = createKafka(`gatekeeper-${RUN_ID}`);
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
await consent.subscribe({ topic: CONSENT_TOPIC, fromBeginning:true });
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
const raw = k.consumer({ groupId: groupId('gatekeeper-raw') });
await raw.connect();
await raw.subscribe({ topic: RAW_TOPIC, fromBeginning:true });

raw.run({
  eachMessage: async ({ message }) => {
    const e = JSON.parse(message.value.toString()); // { patientId, recordedAt, prescription:{...} }
    const keys = Array.from(casesByCitizen.get(e.patientId) || []);
    if (keys.length === 0) {
      console.log('[drop] no consent for', e.patientId);
      return;
    }

    for (const k of keys) {
      const c = consentStore.get(k);
      const [, caseId, citizenId] = k.split('|');
      if (!c) { console.log('[drop] no consent for', e.patientId); continue; }
      if (!c.active) { console.log('[drop] inactive consent', k); continue; }
      if (c.expiresAt && new Date(c.expiresAt) < new Date()) { console.log('[drop] expired', k); continue; }
      if (!c.scopes.has('prescriptions')) { console.log('[drop] scope miss', k, [...c.scopes]); continue; }
      if (citizenId !== e.patientId) { console.log('[drop] no consent for', e.patientId); continue; }

      const topic = viewTopic(caseId, citizenId);
      const rp = 'dwp';
      await producer.send({
        topic,
        messages: [{ key: citizenId, value: JSON.stringify({ citizenId, rp, caseId, prescription: e.prescription, at: new Date().toISOString() }) }]
      });
      console.log('[view]', topic, '→', e.patientId, e.prescription);
    }
  }
});
