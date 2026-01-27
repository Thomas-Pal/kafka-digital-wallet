const fs = require('fs');
const path = require('path');
const { Kafka } = require('kafkajs');

const brokers = (process.env.KAFKA_BROKERS || '127.0.0.1:29092').split(',');
const clientId = process.env.KAFKA_CLIENT_ID || 'wallet-poc';

const kafka = new Kafka({ clientId, brokers });

const loadTopics = () => {
  const raw = fs.readFileSync(path.join(__dirname, 'topics.json'), 'utf-8');
  return JSON.parse(raw);
};

const upsertTopics = async () => {
  const admin = kafka.admin();
  await admin.connect();
  const topics = loadTopics();
  const existing = await admin.listTopics();

  const toCreate = topics.filter((topic) => !existing.includes(topic.name));
  if (toCreate.length) {
    await admin.createTopics({
      topics: toCreate.map((topic) => ({
        topic: topic.name,
        numPartitions: topic.partitions,
      })),
    });
  }

  await admin.alterConfigs({
    resources: topics.map((topic) => ({
      type: admin.resourceTypes.TOPIC,
      name: topic.name,
      configEntries: [{ name: 'retention.ms', value: String(topic.retentionMs) }],
    })),
  });

  await admin.disconnect();
};

upsertTopics().catch((error) => {
  console.error('Failed to init topics:', error);
  process.exit(1);
});
