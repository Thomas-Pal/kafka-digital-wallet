import { Kafka, logLevel } from 'kafkajs';

const kafka = new Kafka({ brokers: ['127.0.0.1:29092'], logLevel: logLevel.NOTHING });
const consumer = kafka.consumer({ groupId: 'debug-consumer' });

(async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'nhs.raw.prescriptions', fromBeginning: true });
  console.log('👀 consuming nhs.raw.prescriptions ...');
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const key = message.key?.toString();
      const val = message.value?.toString();
      console.log(`📥 ${topic} [p${partition}] key=${key} value=${val}`);
    }
  });
})();
