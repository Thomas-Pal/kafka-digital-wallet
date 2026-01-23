import express from 'express';
import fetch from 'node-fetch';
import { createKafka, waitForBroker } from '../lib/kafka.js';
import { allowAll } from '../utils/cors.js';

const app = express();
app.use(express.json());
app.use(allowAll);

const cases = new Map();
const seenEvents = new Set();

const kafka = createKafka('dwp-api');
await waitForBroker(kafka);
const consumer = kafka.consumer({ groupId: 'dwp-api' });
await consumer.connect();
await consumer.subscribe({ topic: /^views\.permitted\.dwp\.(uc|pip)$/, fromBeginning: false });

const pushAudit = async (event) => {
  try {
    await fetch('http://localhost:4000/consent/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'viewed',
        grantedTo: 'dwp',
        scopes: [event.reason],
        detail: `Viewed by DWP case ${event.caseId || 'pending'} at ${new Date().toLocaleTimeString()}`,
      }),
    });
  } catch (_) {
    // ignore audit failures
  }
};

const toEvidence = (view) => {
  if (view.caseType === 'UC') {
    return [
      {
        type: 'Employment termination',
        summary: 'Termination summary for Universal Credit evidence.',
        details: view.evidence.employment || {},
      },
      ...(view.evidence.health
        ? [
            {
              type: 'Health snapshot',
              summary: 'Linked health evidence (consented).',
              details: view.evidence.health,
            },
          ]
        : []),
    ];
  }
  return [
    {
      type: 'Prescription evidence',
      summary: 'NHS prescriptions for PIP case evidence.',
      details: view.evidence.health || {},
    },
  ];
};

await consumer.run({
  eachMessage: async ({ message }) => {
    const eventId = message.headers?.['x-event-id']?.toString();
    if (eventId && seenEvents.has(eventId)) return;
    if (eventId) seenEvents.add(eventId);
    const payload = JSON.parse(message.value.toString());
    const caseId = payload.caseId || `${payload.caseType?.toLowerCase() || 'case'}-${payload.citizenId}`;
    const existing = cases.get(caseId) || {
      caseId,
      citizenId: payload.citizenId,
      caseType: payload.caseType,
      status: 'awaiting-evidence',
      evidence: [],
      timeline: [],
      createdAt: new Date().toISOString(),
      lastUpdate: null,
    };

    const evidence = toEvidence(payload);
    existing.evidence.push(...evidence);
    existing.status = 'ready-to-assess';
    existing.lastUpdate = new Date().toISOString();
    existing.timeline.push({
      id: `grant-${payload.eventId}`,
      label: `Consent granted (${payload.reason})`,
      at: payload.grantedAt || existing.lastUpdate,
    });
    existing.timeline.push({
      id: `evidence-${payload.eventId}`,
      label: 'Evidence received',
      at: existing.lastUpdate,
    });
    existing.caseType = payload.caseType;
    existing.nhsId = payload.citizenId;
    existing.niNumber = payload.evidence?.employment?.niNumber;
    cases.set(caseId, existing);

    console.log(`[dwp-api] view consumed ${eventId || payload.eventId}`);
    pushAudit({ ...payload, caseId });
  },
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.get('/api/cases', (_req, res) => {
  const list = Array.from(cases.values()).map((c) => {
    const now = new Date();
    const createdAt = new Date(c.createdAt);
    const slaBreached = now.getTime() - createdAt.getTime() > 1000 * 60 * 60 * 24 * 7;
    return {
      caseId: c.caseId,
      citizenId: c.citizenId,
      caseType: c.caseType,
      status: c.status,
      lastUpdate: c.lastUpdate,
      evidenceCount: c.evidence.length,
      slaBreached,
    };
  });
  res.json(list);
});

app.get('/api/case/:id', (req, res) => {
  const detail = cases.get(req.params.id);
  if (!detail) {
    return res.status(404).json({ error: 'case not found' });
  }
  const now = new Date();
  const createdAt = new Date(detail.createdAt);
  const slaBreached = now.getTime() - createdAt.getTime() > 1000 * 60 * 60 * 24 * 7;
  res.json({
    ...detail,
    slaBreached,
  });
});

app.get('/api/stats', (_req, res) => {
  const values = Array.from(cases.values());
  const ready = values.filter((c) => c.status === 'ready-to-assess').length;
  const awaiting = values.filter((c) => c.status !== 'ready-to-assess').length;
  res.json({ total: values.length, ready, awaiting });
});

app.listen(5001, () => console.log('DWP API listening on :5001'));
