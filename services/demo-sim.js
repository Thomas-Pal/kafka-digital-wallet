import express from 'express';
import { Kafka, logLevel } from 'kafkajs';
import { PrescriptionEvent, TerminationEvent, P45SummaryEvent } from './schemas.js';
import fetch from 'node-fetch';

const PORT = process.env.DEMO_SIM_PORT || 5002;
const BOOT = process.env.KAFKA_BOOTSTRAP || '127.0.0.1:29092';
const CONSENT_API = process.env.CONSENT_API || 'http://localhost:4000';

const kafka = new Kafka({ clientId: 'demo-sim', brokers: [BOOT], logLevel: logLevel.NOTHING });
const producer = kafka.producer();
await producer.connect();

const app = express();
app.use(express.json());

app.post('/api/sim/request-consent', async (req, res) => {
  // { rp, citizenId, caseId, scopes, reason }
  const body = req.body;
  const r = await fetch(`${CONSENT_API}/api/request`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  const json = await r.json();
  res.json(json);
});

app.post('/api/sim/nhs/prescription', async (req, res) => {
  const evt = PrescriptionEvent(req.body || {});
  await producer.send({ topic: 'nhs.raw.prescriptions', messages: [{ key: evt.citizenId, value: JSON.stringify(evt) }] });
  res.json({ ok: true, evt });
});

app.post('/api/sim/employment/termination', async (req, res) => {
  const evt = TerminationEvent(req.body || {});
  await producer.send({ topic: 'employment.termination', messages: [{ key: evt.citizenId, value: JSON.stringify(evt) }] });
  res.json({ ok: true, evt });
});

app.post('/api/sim/hmrc/p45', async (req, res) => {
  const evt = P45SummaryEvent(req.body || {});
  await producer.send({ topic: 'hmrc.p45.summary', messages: [{ key: evt.citizenId, value: JSON.stringify(evt) }] });
  res.json({ ok: true, evt });
});

app.listen(PORT, () => console.log(`Demo Simulator on :${PORT}`));
