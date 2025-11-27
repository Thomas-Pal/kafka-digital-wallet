import { Kafka } from 'kafkajs';
import { BROKERS, RAW_TOPIC } from './config.js';

const k = new Kafka({ brokers: BROKERS });
const p = k.producer();

const now = () => new Date().toISOString();
const events = [
  { patientId: 'nhs-999', recordedAt: now(), prescription: { drug: 'Sumatriptan', dose: '50mg', repeats: 2, prescriber: 'GP-123', internalNotes: 'private' } },
  { patientId: 'nhs-123', recordedAt: now(), prescription: { drug: 'Omeprazole', dose: '20mg', repeats: 1, prescriber: 'GP-321' } }
];

(async () => {
  await p.connect();
  for (const e of events) {
    await p.send({ topic: RAW_TOPIC, messages: [{ key: e.patientId, value: JSON.stringify(e) }] });
    console.log('RAW sent:', e.patientId, e.prescription.drug);
  }
  await p.disconnect();
})();
