import { Kafka } from 'kafkajs';
import { BROKERS, RAW_TOPIC, CONSENT_TOPIC, VIEW_TOPIC, CASE_BY_CITIZEN } from './config.js';

const kafka = new Kafka({ brokers: BROKERS });
const admin = kafka.admin();
const consentStore = new Map(); // key: rp|case|citizen -> {active, scopes, expiresAt}
const rawBuffer = new Map(); // citizenId -> minimal RAW events kept for replay when consent arrives
const keyFor = (rp, caseId, citizenId) => `${rp}|${caseId}|${citizenId}`;

const bufferRaw = (citizenId, minimalEvent) => {
  const current = rawBuffer.get(citizenId) || [];
  current.push(minimalEvent);
  // keep last 20 per citizen for a quick backfill when consent is granted
  if (current.length > 20) current.shift();
  rawBuffer.set(citizenId, current);
};

const ensureViewTopic = async (topic) => {
  try {
    await admin.createTopics({
      topics: [
        {
          topic,
          configEntries: [{ name: 'retention.ms', value: String(7 * 24 * 60 * 60 * 1000) }]
        }
      ],
      waitForLeaders: true
    });
  } catch (err) {
    if (!/Topic '.+' already exists/.test(err.message)) {
      console.warn('[gatekeeper] ensureViewTopic warn', err.message);
    }
  }
};

const forwardIfPermitted = async (caseId, citizenId, minimal) => {
  const key = keyFor('dwp', caseId, citizenId);
  const consentEntry = consentStore.get(key);
  if (!consentEntry || !consentEntry.active || new Date(consentEntry.expiresAt) < new Date() || !consentEntry.scopes.has('prescriptions')) return;

  const viewTopic = VIEW_TOPIC(caseId, citizenId);
  await ensureViewTopic(viewTopic);
  await producer.send({
    topic: viewTopic,
    messages: [{ key: citizenId, value: JSON.stringify(minimal), headers: { rp: 'dwp', case_id: caseId } }]
  });
  console.log('[view]', viewTopic, '→', citizenId, minimal.prescription.drug);
};

const replayBuffered = async (rp, caseId, citizenId) => {
  if (rp !== 'dwp') return; // demo assumes DWP relying party
  const buffered = rawBuffer.get(citizenId) || [];
  for (const minimal of buffered) {
    await forwardIfPermitted(caseId, citizenId, minimal);
  }
};

const producer = kafka.producer();

const waitForKafka = async () => {
  await admin.connect();
  let ready = false;
  while (!ready) {
    try {
      await admin.fetchTopicMetadata({ topics: [RAW_TOPIC, CONSENT_TOPIC] });
      ready = true;
    } catch (err) {
      console.warn('[gatekeeper] waiting for Kafka...', err.message);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
};

await waitForKafka();
await producer.connect();

// consume consent events
const consent = kafka.consumer({ groupId: 'gatekeeper-consent' });
await consent.connect();
await consent.subscribe({ topic: CONSENT_TOPIC, fromBeginning: true });
consent
  .run({
    eachMessage: async ({ message }) => {
      const evt = JSON.parse(message.value.toString());
      const key = keyFor(evt.rp, evt.caseId, evt.citizenId);
      if (evt.eventType === 'grant') {
        consentStore.set(key, {
          active: true,
          scopes: new Set(evt.scopes || []),
          expiresAt: evt.expiresAt
        });
        await replayBuffered(evt.rp, evt.caseId, evt.citizenId);
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
  })
  .catch((err) => {
    console.error('[gatekeeper-consent] crash', err);
    process.exit(1);
  });

// consume RAW and forward when permitted
const raw = kafka.consumer({ groupId: 'gatekeeper-raw' });
await raw.connect();
await raw.subscribe({ topic: RAW_TOPIC, fromBeginning: true });
raw
  .run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());
      const caseId = CASE_BY_CITIZEN[event.patientId];
      if (!caseId) return; // not part of the demo mapping
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
      bufferRaw(event.patientId, minimal);
      await forwardIfPermitted(caseId, event.patientId, minimal);
    }
  })
  .catch((err) => {
    console.error('[gatekeeper-raw] crash', err);
    process.exit(1);
  });
