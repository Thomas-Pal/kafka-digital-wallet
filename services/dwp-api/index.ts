import express from 'express';
import { allowAll } from '../shared/utils/cors.js';
import { createConsumer } from '../shared/kafka/client.js';

const debug = (...args: unknown[]) => {
  if (process.env.DEBUG === '1') {
    console.log(...args);
  }
};

type EvidenceItem = {
  type: string;
  summary: string;
  details: Record<string, unknown>;
};

type TimelineEntry = {
  id: string;
  label: string;
  at: string;
};

type CaseRecord = {
  caseId: string;
  citizenId: string;
  caseType: string;
  status: string;
  evidence: EvidenceItem[];
  timeline: TimelineEntry[];
  createdAt: string;
  lastUpdate: string | null;
};

const app = express();
app.use(express.json());
app.use(allowAll);

const cases = new Map<string, CaseRecord>();

const toEvidence = (view: any): EvidenceItem[] => {
  if (view.caseType === 'UC') {
    return [
      {
        type: 'Employment termination',
        summary: 'Termination summary for Universal Credit evidence.',
        details: view.evidence?.employment || {},
      },
      ...(view.evidence?.health
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
      details: view.evidence?.health || {},
    },
  ];
};

const consumer = createConsumer('dwp-api');
await consumer.connect();
await consumer.subscribe({ topic: /^views\.permitted\.dwp\.(uc|pip)$/, fromBeginning: false });

await consumer.run({
  eachMessage: async ({ message }) => {
    const payload = JSON.parse(message.value?.toString() || '{}');
    const caseId = payload.caseId || `${(payload.caseType || 'case').toLowerCase()}-${payload.citizenId}`;
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
    existing.caseType = payload.caseType;
    existing.citizenId = payload.citizenId;
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
    cases.set(caseId, existing);

    debug('[dwp-api] view consumed', payload.eventId);
  },
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.get('/api/cases', (_req, res) => {
  const list = Array.from(cases.values()).map((c) => ({
    caseId: c.caseId,
    citizenId: c.citizenId,
    caseType: c.caseType,
    status: c.status,
    evidenceCount: c.evidence.length,
    lastUpdate: c.lastUpdate,
  }));
  res.json(list);
});

app.get('/api/case/:id', (req, res) => {
  const detail = cases.get(req.params.id);
  if (!detail) {
    return res.status(404).json({ error: 'case not found' });
  }
  res.json(detail);
});

app.listen(5001, () => {
  debug('DWP API listening on :5001');
});
