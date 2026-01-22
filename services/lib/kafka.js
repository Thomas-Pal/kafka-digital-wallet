import { Kafka, logLevel } from 'kafkajs';
export const BROKERS = ['127.0.0.1:29092'];
export function createKafka(clientId) {
  return new Kafka({ clientId, brokers: BROKERS, logLevel: logLevel.NOTHING });
}
export function viewTopic(caseId, citizenId) {
  return `views.permitted.dwp.${caseId}.${citizenId}`;
}
