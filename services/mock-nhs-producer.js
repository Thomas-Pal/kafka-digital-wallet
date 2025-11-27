import { Kafka } from 'kafkajs';
import { BROKERS, RAW_TOPIC } from './config.js';

const kafka = new Kafka({ brokers: BROKERS });
const producer = kafka.producer();

const now = () => new Date().toISOString();
const events = [
  {
    patientId: 'nhs-999',
    recordedAt: now(),
    prescription: {
      drug: 'Sumatriptan',
      dose: '50mg',
      repeats: 2,
      prescriber: 'GP-123',
      internalNotes: 'private'
    }
  },
  {
    patientId: 'nhs-123',
    recordedAt: now(),
    prescription: {
      drug: 'Omeprazole',
      dose: '20mg',
      repeats: 1,
      prescriber: 'GP-321'
    }
  }
];

(async () => {
  await producer.connect();
  for (const event of events) {
    await producer.send({
      topic: RAW_TOPIC,
      messages: [{ key: event.patientId, value: JSON.stringify(event) }]
    });
    console.log('RAW sent:', event.patientId, event.prescription.drug);
  }
  await producer.disconnect();
})();
