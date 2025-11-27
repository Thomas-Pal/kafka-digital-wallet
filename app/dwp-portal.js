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
const producer = kafka.producer();

const walletBaseUrl = process.env.WALLET_BASE_URL || 'http://localhost:3000';

const approvedTopic = process.env.DWP_APPROVED_TOPIC || 'dwp.filtered.prescriptions';
const blockedTopic = process.env.DWP_BLOCKED_TOPIC || 'dwp.blocked.prescriptions';
const consentRequestTopic = process.env.DWP_CONSENT_TOPIC || 'dwp.consent.requests';
const defaultRequestingSystem = process.env.DWP_REQUESTING_SYSTEM || 'DWP-casework-portal';

let kafkaReady = false;
let connecting = false;
let lastKafkaError = null;

const consentByPatient = new Map();
const deliveredRecords = [];
const blockedRecords = [];
const sentRequests = [];

const maxRows = { consent: 100, delivered: 200, blocked: 100, requests: 50 };

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
      <strong id="status-heading">${state.kafkaReady ? 'Connected to Kafka' : 'Kafka not ready'} (${state.consumerGroup})</strong>
      <div class="muted" id="status-brokers">Brokers: ${state.brokers.join(', ')}${state.lastKafkaError ? ' | Last error: ' + state.lastKafkaError : ''}</div>
      <div class="muted" id="status-counts">Approved consents: ${state.consentCount} | Delivered: ${state.deliveredCount} | Blocked (no consent): ${state.blockedCount}</div>
    </div>

    <section>
      <h2>Request patient consent</h2>
      <p class="muted">Send a consent request to the citizen's wallet before opening their NHS data.</p>
      <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));">
        ${state.samplePatients
          .map(
            (patient) => `
              <div class="status" data-state="ok">
                <strong>${patient.patientId}</strong>
                <div class="muted">Purpose: ${patient.purpose}</div>
                <div class="muted">Retention: ${patient.retention}</div>
                <div class="muted">System: ${patient.requestingSystem}</div>
                <button data-patient="${patient.patientId}" data-purpose="${patient.purpose}" data-retention="${patient.retention}" data-system="${patient.requestingSystem}">Request consent</button>
              </div>`
          )
          .join('')}
      </div>
      <p id="request-result" class="muted"></p>
      <div class="spacer"></div>
      <h3>Recent consent requests</h3>
      <table>
        <thead>
          <tr>
            <th>Correlation</th>
            <th>Patient</th>
            <th>Purpose</th>
            <th>Requested</th>
          </tr>
        </thead>
        <tbody>
          ${state.requests
            .map(
              (row) => `
                <tr>
                  <td>${row.correlationId}</td>
                  <td>${row.patientId}</td>
                  <td>${row.purpose}</td>
                  <td>${row.requestedAt}</td>
                </tr>`
            )
            .join('')}
        </tbody>
      </table>
      <div class="muted" id="requests-count">Showing ${state.requests.length} of ${state.requestCount} sent requests.</div>
    </section>

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
        <div class="muted" id="consents-count">Showing ${state.consents.length} of ${state.consentCount} consent entries.</div>
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
        <div class="muted" id="delivered-count">Showing ${state.delivered.length} of ${state.deliveredCount} delivered events.</div>
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
      <div class="muted" id="blocked-count">Showing ${state.blocked.length} of ${state.blockedCount} blocked events.</div>
    </section>

    <p class="muted">API endpoints: <code>/api/state</code>, <code>/api/records</code>, <code>/api/blocked</code>, <code>/api/consents</code>, <code>/api/requests</code></p>
    <script>
      const resultBox = document.getElementById('request-result');
      const statusBox = document.getElementById('status');
      const statusHeading = document.getElementById('status-heading');
      const statusBrokers = document.getElementById('status-brokers');
      const statusCounts = document.getElementById('status-counts');

      const requestsTable = document.querySelector('tbody');
      const consentsTable = document.querySelectorAll('tbody')[1];
      const deliveredTable = document.querySelectorAll('tbody')[2];
      const blockedTable = document.querySelectorAll('tbody')[3];

      const requestsCount = document.getElementById('requests-count');
      const consentsCount = document.getElementById('consents-count');
      const deliveredCount = document.getElementById('delivered-count');
      const blockedCount = document.getElementById('blocked-count');

      const requestButtons = Array.from(document.querySelectorAll('button[data-patient]'));

      const renderRows = (rows, mapper) => rows.map(mapper).join('');

      const applyState = (state) => {
        statusBox.dataset.state = state.kafkaReady ? 'ok' : 'warn';
        statusHeading.textContent = (state.kafkaReady ? 'Connected to Kafka' : 'Kafka not ready') + ' (' + state.consumerGroup + ')';
        statusBrokers.textContent = 'Brokers: ' + state.brokers.join(', ') + (state.lastKafkaError ? ' | Last error: ' + state.lastKafkaError : '');
        statusCounts.textContent = 'Approved consents: ' + state.consentCount + ' | Delivered: ' + state.deliveredCount + ' | Blocked (no consent): ' + state.blockedCount;

        requestButtons.forEach((btn) => {
          btn.disabled = !state.kafkaReady;
          btn.title = state.kafkaReady ? '' : 'Waiting for Kafka connection before sending requests';
        });

        requestsTable.innerHTML = renderRows(state.requests, (row) => (
          '<tr>' +
          '<td>' + row.correlationId + '</td>' +
          '<td>' + row.patientId + '</td>' +
          '<td>' + row.purpose + '</td>' +
          '<td>' + row.requestedAt + '</td>' +
          '</tr>'
        ));
        consentsTable.innerHTML = renderRows(state.consents, (row) => (
          '<tr>' +
          '<td>' + row.patientId + '</td>' +
          '<td>' + row.decision + '</td>' +
          '<td>' + row.correlationId + '</td>' +
          '<td>' + row.decidedAt + '</td>' +
          '<td>' + row.reason + '</td>' +
          '</tr>'
        ));
        deliveredTable.innerHTML = renderRows(state.delivered, (row) => (
          '<tr>' +
          '<td>' + row.patientId + '</td>' +
          '<td>' + (row.prescription?.drug || 'n/a') + '</td>' +
          '<td>' + (Array.isArray(row.flags) ? row.flags.join(', ') : '') + '</td>' +
          '<td>' + row.receivedAt + '</td>' +
          '<td><span class="pill approve">approved</span></td>' +
          '</tr>'
        ));
        blockedTable.innerHTML = renderRows(state.blocked, (row) => (
          '<tr>' +
          '<td>' + row.patientId + '</td>' +
          '<td>' + (row.prescription?.drug || 'n/a') + '</td>' +
          '<td>' + row.reason + '</td>' +
          '<td>' + row.receivedAt + '</td>' +
          '</tr>'
        ));

        requestsCount.textContent = 'Showing ' + state.requests.length + ' of ' + state.requestCount + ' sent requests.';
        consentsCount.textContent = 'Showing ' + state.consents.length + ' of ' + state.consentCount + ' consent entries.';
        deliveredCount.textContent = 'Showing ' + state.delivered.length + ' of ' + state.deliveredCount + ' delivered events.';
        blockedCount.textContent = 'Showing ' + state.blocked.length + ' of ' + state.blockedCount + ' blocked events.';
      };

      const refresh = async () => {
        try {
          const res = await fetch('/api/state');
          if (!res.ok) throw new Error('Failed to fetch portal state');
          const state = await res.json();
          applyState(state);
        } catch (err) {
          statusBox.dataset.state = 'error';
          statusHeading.textContent = 'Portal API unreachable';
          resultBox.textContent = 'Failed to refresh portal state: ' + (err.message || err);
        }
      };

      requestButtons.forEach((btn) => {
        btn.addEventListener('click', async () => {
          const payload = {
            patientId: btn.dataset.patient,
            purpose: btn.dataset.purpose,
            retention: btn.dataset.retention,
            requestingSystem: btn.dataset.system
          };
          btn.disabled = true;
          resultBox.textContent = 'Sending consent request...';
          try {
            const res = await fetch('/api/request-consent', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(payload)
            });
            if (!res.ok) {
              const body = await res.text();
              throw new Error(body || 'Request failed');
            }
            const data = await res.json();
            resultBox.textContent = 'Sent request ' + data.correlationId + ' for ' + payload.patientId + '. Open the wallet to approve it.';
            refresh();
          } catch (err) {
            resultBox.textContent = 'Failed to send consent request: ' + (err.message || err);
          } finally {
            btn.disabled = false;
          }
        });
      });

      refresh();
      setInterval(refresh, 5000);
    </script>
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
  requestCount: sentRequests.length,
  consents: Array.from(consentByPatient.values()).slice(0, maxRows.consent),
  delivered: deliveredRecords.slice(0, maxRows.delivered),
  blocked: blockedRecords.slice(0, maxRows.blocked),
  requests: sentRequests.slice(0, maxRows.requests),
  samplePatients: [
    { patientId: 'nhs-999', purpose: 'benefit-eligibility-check', retention: '6 months', requestingSystem: defaultRequestingSystem },
    { patientId: 'nhs-123', purpose: 'fraud-prevention', retention: '3 months', requestingSystem: defaultRequestingSystem },
    { patientId: 'nhs-777', purpose: 'fraud-prevention', retention: '3 months', requestingSystem: defaultRequestingSystem }
  ]
});

const recordRequest = (request) => {
  sentRequests.unshift(request);
  if (sentRequests.length > maxRows.requests) sentRequests.pop();
};

const notifyWallet = async (request) => {
  try {
    const res = await fetch(`${walletBaseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Wallet responded with ${res.status}: ${text}`);
    }
  } catch (err) {
    console.error('Wallet did not accept the consent request yet', err);
  }
};

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

const sendConsentRequest = async (request) => {
  const payload = {
    ...request,
    correlationId:
      request.correlationId || `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    requestedAt: request.requestedAt || new Date().toISOString(),
    requestingSystem: request.requestingSystem || defaultRequestingSystem
  };

  if (!kafkaReady) {
    throw new Error('Kafka is not ready; wait for the portal to finish connecting before sending a request');
  }

  await producer.send({
    topic: consentRequestTopic,
    messages: [{ key: payload.patientId, value: JSON.stringify(payload) }]
  });

  recordRequest(payload);
  await notifyWallet(payload);
  console.log('📨 sent consent request for', payload.patientId, 'to topic', consentRequestTopic);
  return payload;
};

const startService = async () => {
  const app = express();
  app.use(express.json());

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
  app.get('/api/requests', (_req, res) => res.json(sentRequests));

  app.post('/api/request-consent', async (req, res) => {
    try {
      const { patientId, purpose, retention, requestingSystem } = req.body || {};
      if (!patientId || !purpose) {
        return res
          .status(400)
          .json({ error: 'patientId and purpose are required to send a consent request' });
      }

      const payload = await sendConsentRequest({ patientId, purpose, retention, requestingSystem });
      return res.json({ ok: true, correlationId: payload.correlationId });
    } catch (err) {
      console.error('Failed to publish consent request', err);
      return res.status(500).json({ error: err?.message || 'Failed to publish consent request' });
    }
  });
  app.get('/', (_req, res) => res.send(renderDashboard(snapshot())));

  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log(`DWP caseworker portal at http://localhost:${port}`));
  await producer.connect();
  startKafka();
};

startService().catch((err) => {
  console.error('Failed to start DWP portal', err);
  process.exit(1);
});
