import express from 'express';
import { Kafka, logLevel } from 'kafkajs';

const brokerConfig = process.env.KAFKA_BROKER || process.env.KAFKA_BROKERS || '127.0.0.1:29092,kafka:9092';
const brokers = brokerConfig
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

const kafka = new Kafka({ brokers, logLevel: logLevel.NOTHING });
const baseGroup = process.env.DWP_CONSUMER_GROUP || 'dwp-portal';
const demoRunId = process.env.DEMO_RUN_ID;
const consumerGroup = demoRunId ? `${baseGroup}-${demoRunId}` : baseGroup;
let consumer = kafka.consumer({ groupId: consumerGroup });

const approvedTopic = process.env.DWP_APPROVED_TOPIC || 'dwp.filtered.prescriptions';
const blockedTopic = process.env.DWP_BLOCKED_TOPIC || 'dwp.blocked.prescriptions';

let kafkaReady = false;
let connecting = false;
let lastKafkaError = null;

const consentByPatient = new Map();
const deliveredRecords = [];
const blockedRecords = [];

const maxRows = { consent: 100, delivered: 200, blocked: 100 };

const renderDecisionChip = (decision = 'pending') => {
  const cls = decision === 'approved' ? 'approve' : decision === 'rejected' ? 'reject' : 'pending';
  return `<span class="pill ${cls}">${decision}</span>`;
};

const renderDashboard = (state) => `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>DWP caseworker portal (mock)</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 2rem; background: #0f172a; color: #e2e8f0; }
      h1, h2 { color: #e2e8f0; }
      a { color: #38bdf8; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #334155; padding: 10px; }
      th { background: #1f2937; text-align: left; }
      td { background: #111827; }
      .muted { color: #94a3b8; }
      .pill { display: inline-block; padding: 4px 8px; border-radius: 999px; font-size: 12px; text-transform: capitalize; }
      .pill.approve { background: #065f46; color: #bbf7d0; }
      .pill.reject { background: #7f1d1d; color: #fecdd3; }
      .pill.pending { background: #1e293b; color: #e2e8f0; border: 1px dashed #334155; }
      .grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
      .status { padding: 12px 14px; background: #0b2537; border: 1px solid #1e293b; border-radius: 8px; margin: 12px 0; }
      .status[data-state="ok"] { border-color: #14532d; background: #0c2f1f; color: #bbf7d0; }
      .status[data-state="error"] { border-color: #7f1d1d; background: #2f1316; color: #fecdd3; }
      .status[data-state="warn"] { border-color: #92400e; background: #2f1b0f; color: #fbbf24; }
      @media (min-width: 900px) { .grid { grid-template-columns: repeat(2, 1fr); } }
    </style>
  </head>
  <body>
    <h1>DWP caseworker portal (mock consumer)</h1>
    <p class="muted">Reads NHS prescription events but only shows records where the citizen has approved consent.</p>

    <div class="status" id="status" data-state="${state.kafkaReady ? 'ok' : 'warn'}">
      <strong>${state.kafkaReady ? 'Connected to Kafka' : 'Kafka not ready'} (${state.consumerGroup})</strong>
      <div class="muted">Brokers: ${state.brokers.join(', ')}${state.lastKafkaError ? ' | Last error: ' + state.lastKafkaError : ''}</div>
      <div class="muted">Approved consents: ${state.consentCount} | Delivered: ${state.deliveredCount} | Blocked (no consent): ${state.blockedCount}</div>
    </div>

    <div class="grid">
      <section>
        <h2>Latest consent decisions</h2>
        <p class="muted">Pulled from <code>nhs.consent.decisions</code> to drive downstream filtering.</p>
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Decision</th>
              <th>Correlation</th>
              <th>Decided</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            ${state.consents
              .map(
                (row) => `
                  <tr>
                    <td>${row.patientId}</td>
                    <td>${renderDecisionChip(row.decision)}</td>
                    <td>${row.correlationId}</td>
                    <td>${row.decidedAt}</td>
                    <td>${row.reason}</td>
                  </tr>`
              )
              .join('')}
          </tbody>
        </table>
        <div class="muted">Showing ${state.consents.length} of ${state.consentCount} consent entries.</div>
      </section>

      <section>
        <h2>Delivered NHS records (consent approved)</h2>
        <p class="muted">Only patients with an approved consent reach the caseworker view.</p>
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Drug</th>
              <th>Flags</th>
              <th>Received</th>
              <th>Consent</th>
            </tr>
          </thead>
          <tbody>
            ${state.delivered
              .map(
                (row) => `
                  <tr>
                    <td>${row.patientId}</td>
                    <td>${row.prescription?.drug || 'n/a'}</td>
                    <td>${Array.isArray(row.flags) ? row.flags.join(', ') : ''}</td>
                    <td>${row.receivedAt}</td>
                    <td>${renderDecisionChip('approved')}</td>
                  </tr>`
              )
              .join('')}
          </tbody>
        </table>
        <div class="muted">Showing ${state.delivered.length} of ${state.deliveredCount} delivered events.</div>
      </section>
    </div>

    <section>
      <h2>Blocked events (no consent yet)</h2>
      <p class="muted">These records were withheld because the patient has rejected consent or has not responded.</p>
      <table>
        <thead>
          <tr>
            <th>Patient</th>
            <th>Drug</th>
            <th>Reason</th>
            <th>Observed</th>
          </tr>
        </thead>
        <tbody>
          ${state.blocked
            .map(
              (row) => `
                <tr>
                  <td>${row.patientId}</td>
                  <td>${row.prescription?.drug || 'n/a'}</td>
                  <td>${row.reason}</td>
                  <td>${row.receivedAt}</td>
                </tr>`
            )
            .join('')}
        </tbody>
      </table>
      <div class="muted">Showing ${state.blocked.length} of ${state.blockedCount} blocked events.</div>
    </section>

    <p class="muted">API endpoints: <code>/api/state</code>, <code>/api/records</code>, <code>/api/blocked</code>, <code>/api/consents</code></p>
  </body>
</html>`;

const snapshot = () => ({
  kafkaReady,
  brokers,
  consumerGroup,
  lastKafkaError,
  consentCount: consentByPatient.size,
  deliveredCount: deliveredRecords.length,
  blockedCount: blockedRecords.length,
  consents: Array.from(consentByPatient.values()).slice(0, maxRows.consent),
  delivered: deliveredRecords.slice(0, maxRows.delivered),
  blocked: blockedRecords.slice(0, maxRows.blocked)
});

const upsertConsent = (decision) => {
  if (!decision?.patientId) return;
  consentByPatient.set(decision.patientId, decision);
  if (consentByPatient.size > maxRows.consent) {
    const firstKey = consentByPatient.keys().next().value;
    consentByPatient.delete(firstKey);
  }
};

const recordDelivered = (event) => {
  deliveredRecords.unshift({ ...event, receivedAt: new Date().toISOString() });
  if (deliveredRecords.length > maxRows.delivered) deliveredRecords.pop();
};

const recordBlocked = (event, reason) => {
  blockedRecords.unshift({ ...event, receivedAt: new Date().toISOString(), reason });
  if (blockedRecords.length > maxRows.blocked) blockedRecords.pop();
};

const resetConsumer = async () => {
  try {
    await consumer.disconnect();
  } catch (err) {
    if (err?.type !== 'KAFKAJS_NOT_CONNECTED') console.error('Failed to disconnect DWP consumer', err);
  }
  consumer = kafka.consumer({ groupId: consumerGroup });
};

async function handleKafkaError(err) {
  kafkaReady = false;
  lastKafkaError = err?.message || 'Unknown Kafka error';
  console.error('DWP consumer failed', err);
  await resetConsumer();
  setTimeout(() => startKafka(), 1500);
}

async function startKafka() {
  if (connecting) return;
  connecting = true;
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: 'nhs.consent.decisions', fromBeginning: true });
    await consumer.subscribe({ topic: approvedTopic, fromBeginning: true });
    await consumer.subscribe({ topic: blockedTopic, fromBeginning: true });

    kafkaReady = true;
    lastKafkaError = null;
    console.log('🔌 DWP portal connected to Kafka via', brokers.join(', '));

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        try {
          const raw = message.value?.toString() || '{}';
          const payload = JSON.parse(raw);

          if (topic === 'nhs.consent.decisions') {
            upsertConsent(payload);
            console.log('📥 consent updated for', payload.patientId, payload.decision);
            return;
          }

          if (topic === approvedTopic) {
            recordDelivered(payload);
            console.log('✅ delivered NHS record to DWP view for', payload.patientId);
            return;
          }

          if (topic === blockedTopic) {
            recordBlocked(payload, payload.reason || 'no consent yet');
            console.log('⛔ blocked NHS record for', payload.patientId, payload.reason || 'no consent yet');
            return;
          }
        } catch (err) {
          console.error('Failed to process DWP consumer message', err);
        }
      }
    });
  } catch (err) {
    await handleKafkaError(err);
  } finally {
    connecting = false;
  }
}

const startService = async () => {
  const app = express();

  app.get('/healthz', (_req, res) => {
    if (!kafkaReady) {
      return res.status(503).json({ status: 'starting', kafkaReady, lastKafkaError });
    }
    return res.json({ status: 'ok', kafkaReady });
  });
  app.get('/api/state', (_req, res) => res.json(snapshot()));
  app.get('/api/records', (_req, res) => res.json(deliveredRecords));
  app.get('/api/blocked', (_req, res) => res.json(blockedRecords));
  app.get('/api/consents', (_req, res) => res.json(Array.from(consentByPatient.values())));
  app.get('/', (_req, res) => res.send(renderDashboard(snapshot())));

  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log(`DWP caseworker portal at http://localhost:${port}`));
  startKafka();
};

startService().catch((err) => {
  console.error('Failed to start DWP portal', err);
  process.exit(1);
});
