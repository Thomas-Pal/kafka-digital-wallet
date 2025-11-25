import { Kafka, logLevel } from 'kafkajs';

const broker = process.env.KAFKA_BROKER || '127.0.0.1:29092';
const kafka = new Kafka({ brokers: [broker], logLevel: logLevel.NOTHING });
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
  console.log(`👀 consuming topics via ${broker}:`, topics.join(', '));

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const key = message.key?.toString();
      const val = message.value?.toString();
      console.log(`📥 ${topic} [p${partition}] key=${key} value=${val}`);
    }
  });
})();
