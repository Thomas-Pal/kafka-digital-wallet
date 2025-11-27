import { Kafka, logLevel } from 'kafkajs';
import express from 'express';
import { BROKERS, VIEW_TOPIC } from './config.js';

const app = express();
app.use((_, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  next();
});
app.options('*', (_req, res) => res.sendStatus(204));

const topic = VIEW_TOPIC('4711', 'nhs-999');
const kafka = new Kafka({ brokers: BROKERS, logLevel: logLevel.NOTHING });
const consumer = kafka.consumer({ groupId: 'dwp-case-4711' });
const buffer = [];

(async () => {
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });
  await consumer.run({
    eachMessage: async ({ message }) => {
      const value = JSON.parse(message.value.toString());
      buffer.push({ ts: Date.now(), v: value });
      console.log('DWP VIEW:', value.patientId, value.prescription.drug);
    }
  });
})();

app.get('/api/case/4711/view', (_req, res) => res.json(buffer.slice(-50)));
app.listen(5001, () => console.log('DWP API on :5001 (GET /api/case/4711/view)'));
