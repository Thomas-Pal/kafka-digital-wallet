import { Kafka } from 'kafkajs';

const broker = process.env.KAFKA_BROKER || '127.0.0.1:29092';
const kafka = new Kafka({ brokers: [broker] });
const producer = kafka.producer();

const prescriptions = [
  {
    patientId: 'nhs-999',
    recordedAt: new Date().toISOString(),
    prescription: {
      drug: 'Sumatriptan',
      dose: '50mg',
      repeats: 2,
      prescriber: 'GP-123',
      internalNotes: 'private'
    },
    flags: ['migraine-management']
  },
  {
    patientId: 'nhs-123',
    recordedAt: new Date().toISOString(),
    prescription: { drug: 'Omeprazole', dose: '20mg', repeats: 1, prescriber: 'GP-321' },
    flags: ['gastro-protection']
  },
  {
    patientId: 'nhs-777',
    recordedAt: new Date().toISOString(),
    prescription: { drug: 'Atorvastatin', dose: '40mg', repeats: 3, prescriber: 'GP-444' },
    flags: ['cardio-risk-reduction']
  }
];

const buildEnriched = (event) => ({
  ...event,
  enrichedAt: new Date().toISOString(),
  derived: {
    consentStatus: 'requires-check',
    clinicalTags: event.flags,
    governanceTier: 'clinical-sensitive'
  }
});

(async () => {
  await producer.connect();

  for (const event of prescriptions) {
    await producer.send({
      topic: 'nhs.raw.prescriptions',
      messages: [{ key: event.patientId, value: JSON.stringify(event) }]
    });
    console.log('✅ sent RAW', event.patientId, event.prescription.drug);

    await producer.send({
      topic: 'nhs.enriched.prescriptions',
      messages: [{
        key: event.patientId,
        value: JSON.stringify(buildEnriched(event))
      }]
    });
    console.log('✨ sent ENRICHED', event.patientId, event.flags.join(','));
  }

  await producer.disconnect();
})();
