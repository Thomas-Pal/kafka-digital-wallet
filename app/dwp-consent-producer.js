import { Kafka } from 'kafkajs';

const kafka = new Kafka({ brokers: ['127.0.0.1:29092'] });
const producer = kafka.producer();

const consentRequests = [
  {
    correlationId: 'req-1001',
    requestingSystem: 'DWP-benefits-gateway',
    purpose: 'benefit-eligibility-check',
    patientId: 'nhs-999',
    requestedAt: new Date().toISOString(),
    retention: '6 months'
  },
  {
    correlationId: 'req-1002',
    requestingSystem: 'DWP-risk-analytics',
    purpose: 'fraud-prevention',
    patientId: 'nhs-123',
    requestedAt: new Date().toISOString(),
    retention: '3 months'
  },
  {
    correlationId: 'req-1003',
    requestingSystem: 'DWP-risk-analytics',
    purpose: 'fraud-prevention',
    patientId: 'nhs-777',
    requestedAt: new Date().toISOString(),
    retention: '3 months'
  }
];

(async () => {
  await producer.connect();
  for (const request of consentRequests) {
    await producer.send({
      topic: 'dwp.consent.requests',
      messages: [{ key: request.patientId, value: JSON.stringify(request) }]
    });
    console.log('📨 sent consent request for', request.patientId, 'from', request.requestingSystem);
  }
  await producer.disconnect();
})();
