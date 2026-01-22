import React, { useEffect, useState } from 'react';
import Cases from './pages/Cases';

type ViewRow = { ts: number; v: any };

type RouteState = { path: string };

function useRoute(): RouteState {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const handler = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);
  return { path };
}

function useCaseView(caseId: string) {
  const [rows, setRows] = useState<ViewRow[]>([]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const response = await fetch(`http://localhost:5001/api/case/${encodeURIComponent(caseId)}/view`)
        .then((r) => r.json())
        .catch(() => []);
      if (active) setRows(Array.isArray(response) ? response : []);
    };
    load();
    const t = setInterval(load, 2000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [caseId]);
  return rows;
}

function CaseDetail({ caseId }: { caseId: string }) {
  const rows = useCaseView(caseId);

  return (
    <div style={{ maxWidth: 1100, margin: '28px auto', fontFamily: 'system-ui', padding: 16 }}>
      <a href="/">← Back to cases</a>
      <h1 style={{ marginTop: 12 }}>Case {caseId}</h1>
      <p style={{ color: '#555' }}>Decoded view messages for this case.</p>

      <div style={{ display: 'grid', gap: 16 }}>
        {rows.map((row, i) => {
          const data = row.v?.data || {};
          const eventType = data.eventType || row.v?.scope;
          const isNhs = eventType === 'nhs.prescription.issued' || row.v?.scope === 'nhs.prescriptions';
          const isTermination = eventType === 'employment.termination';
          const isP45 = eventType === 'hmrc.p45.summary';

          return (
            <div key={`${row.ts}-${i}`} style={{ border: '1px solid #e1e1e1', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, color: '#666' }}>{new Date(row.ts).toLocaleString()}</div>
              <h3 style={{ marginTop: 6 }}>{eventType || 'Event'}</h3>

              {isNhs && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                  <Info label="Drug" value={data.drugName || '—'} />
                  <Info label="Dose (mg)" value={data.doseMg ?? '—'} />
                  <Info label="Quantity" value={data.quantity ?? '—'} />
                  <Info label="SNOMED" value={data.snomedCode || '—'} />
                  <Info label="Prescriber" value={data.prescriberId || '—'} />
                  <Info label="Practice" value={data.gpPracticeName || '—'} />
                </div>
              )}

              {isTermination && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <Info label="Employer" value={data.employerName || '—'} />
                  <Info label="Reason" value={data.reasonCode || '—'} />
                  <Info label="Notice (weeks)" value={data.noticeWeeks ?? '—'} />
                  <Info label="Redundancy Pay" value={data.redundancyPay ?? '—'} />
                  <Info label="Avg Weekly Earnings" value={data.avgWeeklyEarnings ?? '—'} />
                  <Info label="Termination Date" value={data.terminationDate || '—'} />
                </div>
              )}

              {isP45 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <Info label="Employer" value={data.employerName || '—'} />
                  <Info label="Pay YTD" value={data.payYTD ?? '—'} />
                  <Info label="Tax YTD" value={data.taxYTD ?? '—'} />
                  <Info label="Tax Code" value={data.taxCode || '—'} />
                  <Info label="Leaving Date" value={data.leavingDate || '—'} />
                </div>
              )}

              <details style={{ marginTop: 12 }}>
                <summary>Raw JSON</summary>
                <pre style={{ marginTop: 8, background: '#f7f7f7', padding: 12, borderRadius: 8 }}>
                  {JSON.stringify(row.v, null, 2)}
                </pre>
              </details>
            </div>
          );
        })}
      </div>

      {rows.length === 0 && <p style={{ marginTop: 16 }}>No view messages yet.</p>}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ background: '#f9f9f8', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 12, color: '#6c6f73', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ marginTop: 4 }}>{value}</div>
    </div>
  );
}

export default function App() {
  const { path } = useRoute();
  const match = path.match(/^\/case\/(.+)$/);

  if (match) {
    return <CaseDetail caseId={decodeURIComponent(match[1])} />;
  }

  return <Cases />;
}
