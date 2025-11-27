import express from 'express';
import { Kafka, logLevel } from 'kafkajs';

const brokerConfig = process.env.KAFKA_BROKER || process.env.KAFKA_BROKERS || '127.0.0.1:29092,kafka:9092';
const brokers = brokerConfig
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

const kafka = new Kafka({ brokers, logLevel: logLevel.NOTHING });
const consumerGroup = process.env.CONSENT_CONSUMER_GROUP || `consent-service-${Date.now()}`;
let consumer = kafka.consumer({ groupId: consumerGroup });
let producer = kafka.producer();

const autoSeedDelayMs = Number(process.env.AUTO_SEED_MS || 4000);
let autoSeeded = false;

let kafkaReady = false;
let connecting = false;
let lastKafkaError = null;

const pendingRequests = [];
const decisions = [];
const auditTrail = [];

const demoRequests = [
  {
    correlationId: 'req-1001',
    requestingSystem: 'DWP-benefits-gateway',
    purpose: 'benefit-eligibility-check',
    patientId: 'nhs-999',
    retention: '6 months'
  },
  {
    correlationId: 'req-1002',
    requestingSystem: 'DWP-risk-analytics',
    purpose: 'fraud-prevention',
    patientId: 'nhs-123',
    retention: '3 months'
  },
  {
    correlationId: 'req-1003',
    requestingSystem: 'DWP-risk-analytics',
    purpose: 'fraud-prevention',
    patientId: 'nhs-777',
    retention: '3 months'
  }
];

const upsertRequest = (request) => {
  if (!request?.correlationId) return;

  // Skip if a decision already exists for this correlation ID.
  if (decisions.some((d) => d.correlationId === request.correlationId)) return;

  const existingIndex = pendingRequests.findIndex((r) => r.correlationId === request.correlationId);
  if (existingIndex !== -1) pendingRequests.splice(existingIndex, 1);

  pendingRequests.unshift(request);
  if (pendingRequests.length > 50) pendingRequests.pop();
};

const buildDecision = (request, { decision, reason }) => ({
  ...request,
  decidedAt: new Date().toISOString(),
  decision,
  reason: reason || 'User decision captured in digital wallet',
  authorisedBy: 'wallet-user@nhs.net'
});

const recordAudit = (decision) => ({
  eventType: 'consent-decision',
  correlationId: decision.correlationId,
  patientId: decision.patientId,
  requestingSystem: decision.requestingSystem,
  decision: decision.decision,
  reason: decision.reason,
  occurredAt: decision.decidedAt,
  source: 'digital-wallet'
});

const renderRows = (rows) =>
  rows
    .map(
      (row) => `
        <tr>
          <td>${row.correlationId}</td>
          <td>${row.patientId}</td>
          <td>${row.requestingSystem}</td>
          <td>${row.purpose}</td>
          <td><span class="pill ${row.decision === 'approved' ? 'approve' : 'reject'}">${row.decision}</span></td>
          <td>${row.reason}</td>
          <td>${row.decidedAt}</td>
        </tr>`
    )
    .join('');

const renderDashboard = () => `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Digital Consent Wallet (Kafka PoC)</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 2rem; background: #0f172a; color: #e2e8f0; }
      h1, h2 { color: #e2e8f0; }
      a { color: #38bdf8; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #334155; padding: 10px; }
      th { background: #1f2937; text-align: left; }
      td { background: #111827; }
      .muted { color: #94a3b8; }
      .spacer { margin-top: 1rem; }
      .pill { display: inline-block; padding: 4px 8px; border-radius: 999px; font-size: 12px; }
      .pill.approve { background: #065f46; color: #bbf7d0; }
      .pill.reject { background: #7f1d1d; color: #fecdd3; }
      .actions { display: flex; gap: 8px; }
      button { padding: 8px 12px; border: 1px solid #334155; background: #1d4ed8; color: #fff; cursor: pointer; border-radius: 6px; }
      button.secondary { background: #475569; }
      button:hover { opacity: 0.9; }
      .grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
      .status { padding: 12px 14px; background: #0b2537; border: 1px solid #1e293b; border-radius: 8px; margin: 12px 0; }
      .status[data-state="ok"] { border-color: #14532d; background: #0c2f1f; color: #bbf7d0; }
      .status[data-state="error"] { border-color: #7f1d1d; background: #2f1316; color: #fecdd3; }
      .status[data-state="warn"] { border-color: #92400e; background: #2f1b0f; color: #fbbf24; }
      @media (min-width: 900px) {
        .grid { grid-template-columns: repeat(2, 1fr); }
      }
    </style>
  </head>
  <body>
    <h1>Digital Consent Wallet</h1>
    <p>Approve or deny requests from downstream consumers (e.g. DWP) before your data is shared.</p>

    <div class="status" id="status" data-state="error">
      <strong id="status-text">Connecting to Kafka…</strong>
    </div>

    <div class="spacer">
      <button id="inject-demo" class="secondary">Inject demo requests</button>
      <span class="muted">Add sample consent requests if nothing is flowing.</span>
    </div>

    <div class="grid">
      <section>
        <h2>Incoming requests</h2>
        <p class="muted">Requests wait here until a wallet user approves or rejects access.</p>
        <table>
          <thead>
            <tr>
              <th>Correlation ID</th>
              <th>Patient ID</th>
              <th>Requesting System</th>
              <th>Purpose</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="requests-body"></tbody>
        </table>
        <div class="spacer muted" id="requests-empty">Waiting for requests… run the DWP producer to see rows arrive.</div>
      </section>

      <section>
        <h2>Decision history</h2>
        <p class="muted">Completed decisions are published back to Kafka for audit + consumers.</p>
        <table>
          <thead>
            <tr>
              <th>Correlation ID</th>
              <th>Patient ID</th>
              <th>Requesting System</th>
              <th>Purpose</th>
              <th>Decision</th>
              <th>Reason</th>
              <th>Decided At</th>
            </tr>
          </thead>
          <tbody id="decisions-body">
            ${renderRows(decisions)}
          </tbody>
        </table>
        <div class="spacer muted" id="decisions-empty" ${decisions.length ? 'style="display:none"' : ''}>
          Waiting for consent decisions… approve or reject a request to see entries.
        </div>
      </section>
    </div>

    <p class="spacer"><small>API endpoints: <code>/api/requests</code>, <code>/api/decisions</code>, <code>/api/audit</code>, <code>/healthz</code></small></p>

    <script>
      const requestsBody = document.getElementById('requests-body');
      const decisionsBody = document.getElementById('decisions-body');
      const requestsEmpty = document.getElementById('requests-empty');
      const decisionsEmpty = document.getElementById('decisions-empty');
      const statusBox = document.getElementById('status');
      const statusText = document.getElementById('status-text');
      const injectDemo = document.getElementById('inject-demo');

      const setStatus = (state, text) => {
        statusBox.dataset.state = state;
        statusText.textContent = text;
      };

      const fetchState = async () => {
        const res = await fetch('/api/state');
        if (!res.ok) throw new Error('Failed to fetch dashboard state');
        return res.json();
      };

      const applyStatus = (status) => {
        const suffix = status.pendingCount === 0 && status.decisionsCount === 0
          ? ' — waiting for requests (or use demo injector).'
          : '';

        if (status.kafkaReady) {
          const via = status.brokers?.length ? status.brokers.join(', ') : 'Kafka';
          const group = status.consumerGroup || 'consent-service';
          setStatus('ok', 'Connected to Kafka via ' + via + ' (group: ' + group + ')' + suffix);
        } else {
          const kafkaSuffix = status.lastKafkaError ? ': ' + status.lastKafkaError : '';
          setStatus('warn', 'Kafka not ready' + kafkaSuffix + suffix);
        }
      };

      const toDecisionRow = (row) =>
        [
          '<tr>',
          '<td>' + row.correlationId + '</td>',
          '<td>' + row.patientId + '</td>',
          '<td>' + row.requestingSystem + '</td>',
          '<td>' + row.purpose + '</td>',
          '<td><span class="pill ' + (row.decision === 'approved' ? 'approve' : 'reject') + '">' + row.decision + '</span></td>',
          '<td>' + row.reason + '</td>',
          '<td>' + row.decidedAt + '</td>',
          '</tr>'
        ].join('');

      const toRequestRow = (row) =>
        [
          '<tr>',
          '<td>' + row.correlationId + '</td>',
          '<td>' + row.patientId + '</td>',
          '<td>' + row.requestingSystem + '</td>',
          '<td>' + row.purpose + '</td>',
          '<td class="actions">',
          '<button data-action="approve" data-id="' + row.correlationId + '">Approve</button>',
          '<button class="secondary" data-action="reject" data-id="' + row.correlationId + '">Reject</button>',
          '</td>',
          '</tr>'
        ].join('');

      injectDemo?.addEventListener('click', async () => {
        try {
          await fetch('/api/demo/requests', { method: 'POST' });
          await refresh();
        } catch (err) {
          console.error('Failed to seed demo requests', err);
        }
      });

      const sendDecision = async (correlationId, decision) => {
        try {
          await fetch('/api/decisions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correlationId, decision })
          });
          await refresh();
        } catch (err) {
          console.error('Failed to send decision', err);
        }
      };

      requestsBody.addEventListener('click', (evt) => {
        const btn = evt.target.closest('button[data-action]');
        if (!btn) return;
        const decision = btn.dataset.action === 'approve' ? 'approved' : 'rejected';
        sendDecision(btn.dataset.id, decision);
      });

      const refresh = async () => {
        try {
          const state = await fetchState();
          const { status, requests, decisions } = state;

          applyStatus(status);

          requestsBody.innerHTML = requests.map(toRequestRow).join('');
          decisionsBody.innerHTML = decisions.map(toDecisionRow).join('');

          requestsEmpty.style.display = requests.length ? 'none' : 'block';
          decisionsEmpty.style.display = decisions.length ? 'none' : 'block';
        } catch (err) {
          setStatus('error', 'Consent service unreachable');
          console.error('Failed to refresh dashboard', err);
        }
      };

      refresh();
      setInterval(refresh, 3000);
    </script>
  </body>
</html>`;

const resetKafkaClients = async () => {
  try {
    await consumer.disconnect();
  } catch (err) {
    if (err?.type !== 'KAFKAJS_NOT_CONNECTED') console.error('Failed to disconnect consumer', err);
  }

  try {
    await producer.disconnect();
  } catch (err) {
    if (err?.type !== 'KAFKAJS_NOT_CONNECTED') console.error('Failed to disconnect producer', err);
  }

  consumer = kafka.consumer({ groupId: consumerGroup });
  producer = kafka.producer();
};

async function handleKafkaError(err) {
  kafkaReady = false;
  lastKafkaError = err?.message || 'Unknown Kafka error';
  console.error('Consent consumer failed', err);
  await resetKafkaClients();
  setTimeout(() => startKafkaConsumer(), 1500);
}

async function startKafkaConsumer() {
  if (connecting) return;
  connecting = true;

  try {
    await producer.connect();
    await consumer.connect();
    await consumer.subscribe({ topic: 'dwp.consent.requests', fromBeginning: true });

    kafkaReady = true;
    lastKafkaError = null;
    console.log('🔌 connected to Kafka broker(s)', brokers.join(', '), 'as group', consumerGroup);

    consumer
      .run({
        eachMessage: async ({ message }) => {
          try {
            const raw = message.value?.toString() || '{}';
            const request = JSON.parse(raw);
            upsertRequest(request);
            console.log('📬 new consent request awaiting user decision', request.correlationId);
          } catch (err) {
            console.error('Failed to process consent request message', err);
          }
        }
      })
      .catch(handleKafkaError);
  } catch (err) {
    await handleKafkaError(err);
  } finally {
    connecting = false;
  }
}

const statusSnapshot = () => ({
  kafkaReady,
  brokers,
  consumerGroup,
  pendingCount: pendingRequests.length,
  decisionsCount: decisions.length,
  auditCount: auditTrail.length,
  lastKafkaError,
  autoSeeded
});

const seedDemo = async () => {
  const now = Date.now();
  const entries = demoRequests.map((req, idx) => ({
    ...req,
    correlationId: `${req.correlationId}-${now}-${idx}`,
    requestedAt: new Date().toISOString()
  }));

  for (const entry of entries) {
    upsertRequest(entry);
  }

  if (kafkaReady) {
    try {
      await producer.send({
        topic: 'dwp.consent.requests',
        messages: entries.map((req) => ({ key: req.patientId, value: JSON.stringify(req) }))
      });
      console.log('🧪 seeded demo consent requests into Kafka');
    } catch (err) {
      console.error('Failed to seed demo requests into Kafka', err);
    }
  } else {
    console.log('🧪 demo requests added locally (Kafka not connected yet)');
  }
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
  app.get('/api/status', (_req, res) => res.json(statusSnapshot()));
  app.get('/api/state', (_req, res) =>
    res.json({ status: statusSnapshot(), requests: pendingRequests, decisions })
  );
  app.get('/api/requests', (_req, res) => res.json(pendingRequests));
  app.get('/api/decisions', (_req, res) => res.json(decisions));
  app.get('/api/audit', (_req, res) => res.json(auditTrail));
  app.post('/api/decisions', async (req, res) => {
    const { correlationId, decision, reason } = req.body || {};
    if (!correlationId || !decision) {
      return res.status(400).json({ error: 'correlationId and decision are required' });
    }

    const requestIndex = pendingRequests.findIndex((r) => r.correlationId === correlationId);
    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = pendingRequests.splice(requestIndex, 1)[0];
    const decisionRecord = buildDecision(request, { decision, reason });

    decisions.unshift(decisionRecord);
    if (decisions.length > 50) decisions.pop();

    const auditEvent = recordAudit(decisionRecord);
    auditTrail.unshift(auditEvent);
    if (auditTrail.length > 100) auditTrail.pop();

    if (!kafkaReady) {
      return res.status(503).json({ error: 'Kafka is not connected; retry shortly' });
    }

    try {
      await producer.send({
        topic: 'nhs.consent.decisions',
        messages: [{ key: decisionRecord.patientId, value: JSON.stringify(decisionRecord) }]
      });

      await producer.send({
        topic: 'consent.events',
        messages: [{ key: decisionRecord.patientId, value: JSON.stringify(decisionRecord) }]
      });

      await producer.send({
        topic: 'nhs.audit.events',
        messages: [{ key: decisionRecord.patientId, value: JSON.stringify(auditEvent) }]
      });
    } catch (err) {
      lastKafkaError = err?.message || 'Kafka publish error';
      kafkaReady = false;
      console.error('Failed to publish consent decision', err);
      res.status(503).json({ error: 'Kafka unavailable', details: lastKafkaError });
      setTimeout(startKafkaConsumer, 1000);
      return;
    }

    console.log('✅ user decision captured', decisionRecord.patientId, decisionRecord.decision);
    res.json(decisionRecord);
  });

  app.post('/api/demo/requests', async (_req, res) => {
    await seedDemo();
    res.json({ status: 'ok', count: pendingRequests.length });
  });

  app.get('/', (_req, res) => res.send(renderDashboard()));

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Consent service listening on http://localhost:${port}`);
  });
  startKafkaConsumer();
};

const scheduleAutoSeed = () => {
  if (autoSeeded || autoSeedDelayMs <= 0) return;
  setTimeout(async () => {
    if (pendingRequests.length || decisions.length) return;
    await seedDemo();
    autoSeeded = true;
  }, autoSeedDelayMs);
};

startService().catch((err) => {
  console.error('Consent service failed to start', err);
  process.exit(1);
});

scheduleAutoSeed();
