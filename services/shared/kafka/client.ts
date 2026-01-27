import { Kafka, logLevel } from 'kafkajs';
import { kafkaConfig } from './config.js';

const kafka = new Kafka({
  clientId: kafkaConfig.clientId,
  brokers: kafkaConfig.brokers,
  ssl: kafkaConfig.ssl,
  sasl: kafkaConfig.sasl ?? undefined,
  logLevel: logLevel.NOTHING,
});

const withGroupSuffix = (groupId: string) =>
  kafkaConfig.groupIdSuffix ? `${groupId}-${kafkaConfig.groupIdSuffix}` : groupId;

export const createProducer = () => kafka.producer({ allowAutoTopicCreation: false });
export const createConsumer = (groupId: string) =>
  kafka.consumer({ groupId: withGroupSuffix(groupId), allowAutoTopicCreation: false });
