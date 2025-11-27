import { Kafka } from 'kafkajs';
import { BROKERS, RAW_TOPIC, CONSENT_TOPIC, viewTopic } from './config.js';

const k = new Kafka({ brokers: BROKERS });
const producer = k.producer();
await producer.connect();

// key: "rp|case|citizen" -> { active, scopes:Set, expiresAt }
const consentStore = new Map();
const keyFor = (rp, caseId, citizenId) => `${rp}|${caseId}|${citizenId}`;

// citizenId -> Set(caseId) for RP 'dwp'
const grantsByCitizen = new Map();

// consume consent
const consent = k.consumer({ groupId:'gatekeeper-consent' });
await consent.connect();
await consent.subscribe({ topic: CONSENT_TOPIC, fromBeginning:true });
consent.run({
  eachMessage: async ({ message }) => {
    const evt = JSON.parse(message.value.toString());
    if (evt.rp !== 'dwp') return; // demo scope
    const key = keyFor(evt.rp, evt.caseId, evt.citizenId);

    if (evt.eventType === 'grant') {
      consentStore.set(key, { active:true, scopes:new Set(evt.scopes||[]), expiresAt:evt.expiresAt });
      const s = grantsByCitizen.get(evt.citizenId) || new Set();
      s.add(evt.caseId); grantsByCitizen.set(evt.citizenId, s);
      console.log('[consent] grant', key);
    } else if (evt.eventType === 'revoke') {
      consentStore.set(key, { active:false, scopes:new Set(), expiresAt:new Date(0).toISOString() });
      const s = grantsByCitizen.get(evt.citizenId) || new Set();
      s.delete(evt.caseId); grantsByCitizen.set(evt.citizenId, s);
      console.log('[consent] revoke', key);
    } else if (evt.eventType === 'request') {
      console.log('[consent] request', key);
    }
  }
});

// consume RAW and forward if permitted
const raw = k.consumer({ groupId:'gatekeeper-raw' });
await raw.connect();
await raw.subscribe({ topic: RAW_TOPIC, fromBeginning:true });

raw.run({
  eachMessage: async ({ message }) => {
    const e = JSON.parse(message.value.toString()); // { patientId, recordedAt, prescription:{...} }
    const cases = grantsByCitizen.get(e.patientId) || new Set();
    if (cases.size === 0) return; // no active grants for this citizen

    for (const caseId of cases) {
      const key = keyFor('dwp', caseId, e.patientId);
      const c = consentStore.get(key);
      if (!c || !c.active || new Date(c.expiresAt) < new Date() || !c.scopes.has('prescriptions')) continue;

      const minimal = {
        patientId: e.patientId,
        recordedAt: e.recordedAt,
        prescription: { drug: e.prescription.drug, dose: e.prescription.dose, repeats: e.prescription.repeats, prescriber: e.prescription.prescriber }
      };
      const topic = viewTopic(caseId, e.patientId);
      await producer.send({ topic, messages:[{ key:e.patientId, value: JSON.stringify(minimal), headers:{ rp:'dwp', case_id:caseId } }] });
      console.log('[view]', topic, '→', e.patientId, minimal.prescription.drug);
    }
  }
});
