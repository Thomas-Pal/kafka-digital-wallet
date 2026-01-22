import { Kafka, logLevel } from 'kafkajs';

const BROKERS = (process.env.KAFKA_BROKERS || '127.0.0.1:29092').split(',');

export function createKafka(clientId) {
  return new Kafka({
    clientId,
    brokers: BROKERS,
    logLevel: logLevel.INFO,
    retry: { initialRetryTime: 300, retries: 10 }
  });
}

export async function waitForBroker(kafka) {
  const admin = kafka.admin();
  await admin.connect();
  await admin.fetchTopicMetadata();
  await admin.disconnect();
}

export function viewTopic(caseId, citizenId) {
  return `views.permitted.dwp.${caseId}.${citizenId}`;
}
