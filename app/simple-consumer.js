import { Kafka, logLevel } from 'kafkajs';

const brokerConfig = process.env.KAFKA_BROKERS || process.env.KAFKA_BROKER || '127.0.0.1:29092,kafka:9092';
const brokers = brokerConfig
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

const kafka = new Kafka({ brokers, logLevel: logLevel.NOTHING });
const consumer = kafka.consumer({ groupId: 'debug-consumer' });

const topics = (process.env.TOPICS || 'nhs.raw.prescriptions,nhs.enriched.prescriptions,dwp.consent.requests,nhs.consent.decisions,nhs.audit.events')
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean);

(async () => {
  await consumer.connect();
  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: true });
  }
  console.log(`👀 consuming topics via ${brokers.join(', ')}:`, topics.join(', '));

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const key = message.key?.toString();
      const val = message.value?.toString();
      console.log(`📥 ${topic} [p${partition}] key=${key} value=${val}`);
    }
  });
})();
