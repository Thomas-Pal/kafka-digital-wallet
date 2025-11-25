import { Kafka } from 'kafkajs';

const kafka = new Kafka({ brokers: ['127.0.0.1:29092'] });
const producer = kafka.producer();

const events = [
  {
    patientId: 'nhs-999',
    recordedAt: new Date().toISOString(),
    prescription: { drug: 'Sumatriptan', dose: '50mg', repeats: 2, prescriber: 'GP-123', internalNotes: 'private' }
  },
  {
    patientId: 'nhs-123',
    recordedAt: new Date().toISOString(),
    prescription: { drug: 'Omeprazole', dose: '20mg', repeats: 1, prescriber: 'GP-321' }
  }
];

(async () => {
  await producer.connect();
  for (const e of events) {
    await producer.send({
      topic: 'nhs.raw.prescriptions',
      messages: [{ key: e.patientId, value: JSON.stringify(e) }]
    });
    console.log('✅ sent', e.patientId, e.prescription.drug);
  }
  await producer.disconnect();
})();
