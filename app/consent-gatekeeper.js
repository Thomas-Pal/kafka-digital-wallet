import express from 'express';
import { Kafka, logLevel } from 'kafkajs';

const brokerConfig = process.env.KAFKA_BROKER || process.env.KAFKA_BROKERS || '127.0.0.1:29092,kafka:9092';
const brokers = brokerConfig
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

const consentTopics = (process.env.CONSENT_TOPICS || 'nhs.consent.decisions,consent.events')
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean);

const prescriptionTopic = process.env.RAW_TOPIC || 'nhs.raw.prescriptions';
const approvedTopic = process.env.APPROVED_TOPIC || 'dwp.filtered.prescriptions';
const blockedTopic = process.env.BLOCKED_TOPIC || 'dwp.blocked.prescriptions';

const kafka = new Kafka({ clientId: 'consent-gatekeeper', brokers, logLevel: logLevel.NOTHING });
const baseGroup = process.env.GATEKEEPER_CONSUMER_GROUP || 'consent-gatekeeper';
const demoRunId = process.env.DEMO_RUN_ID;
const consumerGroup = demoRunId ? `${baseGroup}-${demoRunId}` : baseGroup;
let consumer = kafka.consumer({ groupId: consumerGroup });
let producer = kafka.producer();

let kafkaReady = false;
let connecting = false;
let lastKafkaError = null;

const consentByPatient = new Map();
const latestPrescriptionByPatient = new Map();
let approvedCount = 0;
let blockedCount = 0;

const upsertConsent = (decision) => {
  if (!decision?.patientId) return;
  consentByPatient.set(decision.patientId, decision);
};

const evaluatePrescription = async (event) => {
  if (!event?.patientId) return;

  latestPrescriptionByPatient.set(event.patientId, event);
  const consent = consentByPatient.get(event.patientId);

  if (consent?.decision === 'approved') {
    approvedCount += 1;
    await producer.send({
      topic: approvedTopic,
      messages: [
        {
          key: event.patientId,
          value: JSON.stringify({ ...event, consentDecision: consent })
        }
      ]
    });
    return;
  }

  blockedCount += 1;
  const reason = consent?.decision === 'rejected' ? 'rejected by citizen' : 'no consent yet';
  await producer.send({
    topic: blockedTopic,
    messages: [
      {
        key: event.patientId,
        value: JSON.stringify({ ...event, consentDecision: consent, reason })
      }
    ]
  });
};

const resetConsumer = async () => {
  try {
    await consumer.disconnect();
  } catch (err) {
    if (err?.type !== 'KAFKAJS_NOT_CONNECTED') console.error('Failed to disconnect gatekeeper consumer', err);
  }
  consumer = kafka.consumer({ groupId: consumerGroup });
};

async function startKafka() {
  if (connecting) return;
  connecting = true;

  try {
    await producer.connect();
    await consumer.connect();

    for (const topic of consentTopics) {
      await consumer.subscribe({ topic, fromBeginning: true });
    }
    await consumer.subscribe({ topic: prescriptionTopic, fromBeginning: true });

    kafkaReady = true;
    lastKafkaError = null;
    console.log('🔌 Gatekeeper connected to Kafka via', brokers.join(', '));

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        try {
          const raw = message.value?.toString() || '{}';
          const payload = JSON.parse(raw);

          if (consentTopics.includes(topic)) {
            upsertConsent(payload);
            console.log('📥 consent cache updated for', payload.patientId, payload.decision);
            if (payload.decision === 'approved') {
              const cached = latestPrescriptionByPatient.get(payload.patientId);
              if (cached) {
                await evaluatePrescription(cached);
                console.log('🔁 replayed cached prescription for', payload.patientId, 'after approval');
              }
            }
            return;
          }

          if (topic === prescriptionTopic) {
            await evaluatePrescription(payload);
            console.log('🔎 evaluated prescription for', payload.patientId);
          }
        } catch (err) {
          console.error('Gatekeeper failed to process message', err);
        }
      }
    });
  } catch (err) {
    kafkaReady = false;
    lastKafkaError = err?.message || 'Unknown Kafka error';
    console.error('Gatekeeper Kafka error', err);
    await resetConsumer();
    setTimeout(() => startKafka(), 1500);
  } finally {
    connecting = false;
  }
}

const startService = async () => {
  const app = express();

  app.get('/healthz', (_req, res) => {
    if (!kafkaReady) {
      return res.status(503).json({ status: 'starting', kafkaReady, brokers, lastKafkaError });
    }
    return res.json({ status: 'ok', kafkaReady, brokers });
  });
  app.get('/state', (_req, res) =>
    res.json({
      kafkaReady,
      brokers,
      consumerGroup,
      lastKafkaError,
      consentCacheSize: consentByPatient.size,
      approvedCount,
      blockedCount,
      consentTopics,
      prescriptionTopic,
      approvedTopic,
      blockedTopic
    })
  );

  const port = process.env.PORT || 3100;
  app.listen(port, () => console.log(`Consent gatekeeper running at http://localhost:${port}`));
  startKafka();
};

startService().catch((err) => {
  console.error('Failed to start gatekeeper', err);
  process.exit(1);
});
