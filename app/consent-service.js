import express from 'express';
import { Kafka, logLevel } from 'kafkajs';

const broker = process.env.KAFKA_BROKER || '127.0.0.1:29092';
const kafka = new Kafka({ brokers: [broker], logLevel: logLevel.NOTHING });
const consumer = kafka.consumer({ groupId: 'consent-service' });
const producer = kafka.producer();

const pendingRequests = [];
const decisions = [];
const auditTrail = [];

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
      @media (min-width: 900px) {
        .grid { grid-template-columns: repeat(2, 1fr); }
      }
    </style>
  </head>
  <body>
    <h1>Digital Consent Wallet</h1>
    <p>Approve or deny requests from downstream consumers (e.g. DWP) before your data is shared.</p>

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
          const [requestsRes, decisionsRes] = await Promise.all([
            fetch('/api/requests'),
            fetch('/api/decisions')
          ]);
          const [requests, decisions] = await Promise.all([requestsRes.json(), decisionsRes.json()]);

          requestsBody.innerHTML = requests.map(toRequestRow).join('');
          decisionsBody.innerHTML = decisions.map(toDecisionRow).join('');

          requestsEmpty.style.display = requests.length ? 'none' : 'block';
          decisionsEmpty.style.display = decisions.length ? 'none' : 'block';
        } catch (err) {
          console.error('Failed to refresh dashboard', err);
        }
      };

      refresh();
      setInterval(refresh, 3000);
    </script>
  </body>
</html>`;

const startService = async () => {
  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: 'dwp.consent.requests', fromBeginning: true });

  console.log('🔌 connected to Kafka broker', broker);

  const app = express();
  app.use(express.json());

  app.get('/healthz', (_req, res) => res.send('ok'));
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

    await producer.send({
      topic: 'nhs.consent.decisions',
      messages: [{ key: decisionRecord.patientId, value: JSON.stringify(decisionRecord) }]
    });

    await producer.send({
      topic: 'nhs.audit.events',
      messages: [{ key: decisionRecord.patientId, value: JSON.stringify(auditEvent) }]
    });

    console.log('✅ user decision captured', decisionRecord.patientId, decisionRecord.decision);
    res.json(decisionRecord);
  });
  app.get('/', (_req, res) => res.send(renderDashboard()));

    const requestIndex = pendingRequests.findIndex((r) => r.correlationId === correlationId);
    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Request not found' });
    }

  consumer.run({
    eachMessage: async ({ message }) => {
      const raw = message.value?.toString() || '{}';
      const request = JSON.parse(raw);
      pendingRequests.unshift(request);
      if (pendingRequests.length > 50) pendingRequests.pop();
      console.log('📬 new consent request awaiting user decision', request.correlationId);
    }
  }).catch((err) => {
    console.error('Consent consumer failed', err);
    process.exit(1);
  });
  app.get('/', (_req, res) => res.send(renderDashboard()));

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Consent service listening on http://localhost:${port}`);
  });

  consumer
    .run({
      eachMessage: async ({ message }) => {
        try {
          const raw = message.value?.toString() || '{}';
          const request = JSON.parse(raw);
          pendingRequests.unshift(request);
          if (pendingRequests.length > 50) pendingRequests.pop();
          console.log('📬 new consent request awaiting user decision', request.correlationId);
        } catch (err) {
          console.error('Failed to process consent request message', err);
        }
      }
    })
    .catch((err) => {
      console.error('Consent consumer failed', err);
      process.exit(1);
    });
};

startService().catch((err) => {
  console.error('Consent service failed to start', err);
  process.exit(1);
});
