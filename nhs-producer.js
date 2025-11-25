const { Kafka } = require('kafkajs');

const kafka = new Kafka({ brokers: ['127.0.0.1:29092'] });
const producer = kafka.producer();

(async () => {
  await producer.connect();

  const now = new Date().toISOString();
  const events = [
    { patientId: 'nhs-999', recordedAt: now,
      prescription: { drug: 'Atorvastatin', dose: '20mg', repeats: 2, prescriber: 'GP-123', internalNotes: 'private' } },
    { patientId: 'nhs-123', recordedAt: now,
      prescription: { drug: 'Metformin', dose: '500mg', repeats: 1, prescriber: 'GP-555' } },
  ];

  for (const evt of events) {
    await producer.send({ topic: 'nhs.raw.prescriptions',
      messages: [{ key: evt.patientId, value: JSON.stringify(evt) }] });
    console.log('RAW sent for', evt.patientId);
  }

  await producer.disconnect();
})();
