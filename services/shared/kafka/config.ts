export const kafkaConfig = {
  clientId: process.env.KAFKA_CLIENT_ID ?? 'wallet-poc',
  brokers: (process.env.KAFKA_BROKERS ?? '127.0.0.1:29092').split(','),
  ssl: process.env.KAFKA_SSL === '1',
  sasl: process.env.KAFKA_SASL ? JSON.parse(process.env.KAFKA_SASL) : null,
  groupIdSuffix: process.env.KAFKA_GROUP_ID_SUFFIX ?? '',
};
