import express from 'express';
import { Kafka, logLevel } from 'kafkajs';

const kafka = new Kafka({ brokers: ['127.0.0.1:29092'], logLevel: logLevel.NOTHING });
const consumer = kafka.consumer({ groupId: 'consent-service' });
const producer = kafka.producer();

const decisions = [];
const auditTrail = [];

const policy = {
  'nhs-999': { outcome: 'approved', reason: 'citizen consent captured via NHS app (2024-04)' },
  'nhs-123': { outcome: 'approved-with-conditions', reason: 'time-boxed fraud-prevention access' },
  fallback: { outcome: 'manual-review', reason: 'requires IG review before sharing' }
};

const decide = (request) => {
  const rule = policy[request.patientId] || policy.fallback;
  return {
    ...request,
    decidedAt: new Date().toISOString(),
    decision: rule.outcome,
    reason: rule.reason,
    authorisedBy: 'consent-service@nhs.net'
  };
};

const recordAudit = (decision) => ({
  eventType: 'consent-decision',
  correlationId: decision.correlationId,
  patientId: decision.patientId,
  requestingSystem: decision.requestingSystem,
  decision: decision.decision,
  reason: decision.reason,
  occurredAt: decision.decidedAt
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
          <td>${row.decision}</td>
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
    <title>Consent Management (PoC)</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 2rem; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ddd; padding: 8px; }
      th { background: #f3f4f6; text-align: left; }
      .muted { color: #6b7280; }
      .spacer { margin-top: 1rem; }
    </style>
  </head>
  <body>
    <h1>Consent Management – Kafka PoC</h1>
    <p>Live view of DWP inbound requests and NHS decisions. Intended to be front-end friendly.</p>
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
      <tbody>
        ${renderRows(decisions)}
      </tbody>
    </table>
    <div class="spacer muted" id="empty-state" ${decisions.length ? 'style="display:none"' : ''}>
      Waiting for consent decisions… run the DWP producer to see rows arrive.
    </div>
    <p class="spacer"><small>API endpoints: <code>/api/decisions</code>, <code>/api/audit</code>, <code>/healthz</code></small></p>

    <script>
      const tbody = document.querySelector('tbody');
      const emptyState = document.getElementById('empty-state');

      const toRow = (row) => `
        <tr>
          <td>${row.correlationId}</td>
          <td>${row.patientId}</td>
          <td>${row.requestingSystem}</td>
          <td>${row.purpose}</td>
          <td>${row.decision}</td>
          <td>${row.reason}</td>
          <td>${row.decidedAt}</td>
        </tr>`;

      const refresh = async () => {
        try {
          const res = await fetch('/api/decisions');
          const data = await res.json();
          tbody.innerHTML = data.map(toRow).join('');
          emptyState.style.display = data.length ? 'none' : 'block';
        } catch (err) {
          console.error('Failed to refresh decisions', err);
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

  await consumer.run({
    eachMessage: async ({ message }) => {
      const raw = message.value?.toString() || '{}';
      const request = JSON.parse(raw);
      const decision = decide(request);

      decisions.unshift(decision);
      if (decisions.length > 50) decisions.pop();

      const auditEvent = recordAudit(decision);
      auditTrail.unshift(auditEvent);
      if (auditTrail.length > 100) auditTrail.pop();

      await producer.send({
        topic: 'nhs.consent.decisions',
        messages: [{ key: decision.patientId, value: JSON.stringify(decision) }]
      });

      await producer.send({
        topic: 'nhs.audit.events',
        messages: [{ key: decision.patientId, value: JSON.stringify(auditEvent) }]
      });

      console.log('✅ consent decision', decision.patientId, decision.decision);
    }
  });

  const app = express();
  app.use(express.json());

  app.get('/healthz', (_req, res) => res.send('ok'));
  app.get('/api/decisions', (_req, res) => res.json(decisions));
  app.get('/api/audit', (_req, res) => res.json(auditTrail));
  app.get('/', (_req, res) => res.send(renderDashboard()));

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Consent service listening on http://localhost:${port}`);
  });
};

startService().catch((err) => {
  console.error('Consent service failed to start', err);
  process.exit(1);
});
