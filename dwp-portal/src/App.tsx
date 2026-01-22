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
          const data = row.v?.payload || {};
          const eventType = row.v?.source || 'event';
          const isNhs = eventType === 'nhs';
          const isTermination = eventType === 'employment';
          const isP45 = eventType === 'hmrc';

          return (
            <div key={`${row.ts}-${i}`} style={{ border: '1px solid #e1e1e1', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, color: '#666' }}>{new Date(row.ts).toLocaleString()}</div>
              <h3 style={{ marginTop: 6 }}>{eventType || 'Event'}</h3>

              {isNhs && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                  <Info label="Drug" value={data.drug || '—'} />
                  <Info label="Dosage" value={data.dosage ?? '—'} />
                  <Info label="Frequency" value={data.frequency ?? '—'} />
                  <Info label="Prescribed At" value={data.prescribedAt || '—'} />
                  <Info label="GP ODS" value={data.gpOdsCode || '—'} />
                  <Info label="Repeat" value={data.repeat ?? '—'} />
                </div>
              )}

              {isTermination && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <Info label="Employer" value={data.employerId || '—'} />
                  <Info label="Reason" value={data.reasonCode || '—'} />
                  <Info label="Weekly Hours" value={data.weeklyHours ?? '—'} />
                  <Info label="Annual Salary" value={data.annualSalary ?? '—'} />
                  <Info label="Termination Date" value={data.terminationDate || '—'} />
                </div>
              )}

              {isP45 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <Info label="P45 Number" value={data.p45Number || '—'} />
                  <Info label="Pay YTD" value={data.ytdGross ?? '—'} />
                  <Info label="Tax YTD" value={data.ytdTax ?? '—'} />
                  <Info label="Tax Code" value={data.taxCode || '—'} />
                  <Info label="Issued At" value={data.issuedAt || '—'} />
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
