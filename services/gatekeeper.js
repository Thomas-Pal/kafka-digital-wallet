import { Kafka } from 'kafkajs';
import { BROKERS, RAW_TOPIC, CONSENT_TOPIC, VIEW_TOPIC, CASE_BY_CITIZEN } from './config.js';

const kafka = new Kafka({ brokers: BROKERS });
const consentStore = new Map(); // key: rp|case|citizen -> {active, scopes, expiresAt}
const keyFor = (rp, caseId, citizenId) => `${rp}|${caseId}|${citizenId}`;

const producer = kafka.producer();
await producer.connect();

// consume consent events
const consent = kafka.consumer({ groupId: 'gatekeeper-consent' });
await consent.connect();
await consent.subscribe({ topic: CONSENT_TOPIC, fromBeginning: true });
consent.run({
  eachMessage: async ({ message }) => {
    const evt = JSON.parse(message.value.toString());
    const key = keyFor(evt.rp, evt.caseId, evt.citizenId);
    if (evt.eventType === 'grant') {
      consentStore.set(key, {
        active: true,
        scopes: new Set(evt.scopes || []),
        expiresAt: evt.expiresAt
      });
    }
    if (evt.eventType === 'revoke') {
      consentStore.set(key, {
        active: false,
        scopes: new Set(),
        expiresAt: new Date(0).toISOString()
      });
    }
    console.log('[consent]', key, consentStore.get(key));
  }
});

// consume RAW and forward when permitted
const raw = kafka.consumer({ groupId: 'gatekeeper-raw' });
await raw.connect();
await raw.subscribe({ topic: RAW_TOPIC, fromBeginning: true });
raw.run({
  eachMessage: async ({ message }) => {
    const event = JSON.parse(message.value.toString());
    const caseId = CASE_BY_CITIZEN[event.patientId];
    if (!caseId) return; // not part of the demo mapping
    const viewTopic = VIEW_TOPIC(caseId, event.patientId);
    const key = keyFor('dwp', caseId, event.patientId);
    const consentEntry = consentStore.get(key);
    if (!consentEntry || !consentEntry.active || new Date(consentEntry.expiresAt) < new Date() || !consentEntry.scopes.has('prescriptions')) return;

    const minimal = {
      patientId: event.patientId,
      recordedAt: event.recordedAt,
      prescription: {
        drug: event.prescription.drug,
        dose: event.prescription.dose,
        repeats: event.prescription.repeats,
        prescriber: event.prescription.prescriber
      }
    };
    await producer.send({
      topic: viewTopic,
      messages: [{ key: event.patientId, value: JSON.stringify(minimal), headers: { rp: 'dwp', case_id: caseId } }]
    });
    console.log('[view]', viewTopic, '→', event.patientId, minimal.prescription.drug);
  }
});
