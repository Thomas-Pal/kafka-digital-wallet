import React, { useEffect, useMemo, useState } from 'react';

type CaseRow = {
  caseId: string;
  citizenId: string;
  status: 'requested' | 'granted' | 'revoked';
  scopes: string[];
  requestedAt?: string | null;
  expiresAt?: string | null;
  lastEventAt?: string | null;
  totalPrescriptions?: number;
  latestPrescription?: string | null;
  lastViewAt?: string | null;
};

type ViewRow = { ts: number; v: any };

const badgeStyle: Record<CaseRow['status'], { background: string; label: string }> = {
  requested: { background: '#b36b00', label: 'Requested' },
  granted: { background: '#0a7d2b', label: 'Granted' },
  revoked: { background: '#a61e1e', label: 'Revoked' }
};

export default function App() {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [rows, setRows] = useState<ViewRow[]>([]);
  const [selected, setSelected] = useState<string | undefined>(undefined);

  async function refresh(caseId?: string) {
    const r = await fetch('http://localhost:5001/api/cases');
    const data: CaseRow[] = await r.json();
    setCases(data);
    if (caseId) {
      const v = await fetch(`http://localhost:5001/api/case/${caseId}/view`);
      setRows(await v.json());
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const t = setInterval(() => refresh(selected), 1200);
    return () => clearInterval(t);
  }, [selected]);

  const totals = useMemo(() => ({
    total: cases.length,
    granted: cases.filter((c) => c.status === 'granted').length,
    revoked: cases.filter((c) => c.status === 'revoked').length,
    pending: cases.filter((c) => c.status === 'requested').length
  }), [cases]);

  const detail = cases.find((c) => c.caseId === selected);

  function badge(s: CaseRow['status']) {
    const { background, label } = badgeStyle[s];
    return <span style={{ background, color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: 12 }}>{label}</span>;
  }

  function formatTime(val?: string | null) {
    return val ? new Date(val).toLocaleString() : '—';
  }

  return (
    <div style={{ maxWidth: 1100, margin: '28px auto', fontFamily: 'system-ui' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: '#6c6f73', letterSpacing: 1 }}>PORTAL</div>
          <h1 style={{ margin: '4px 0 0' }}>DWP Case Viewer</h1>
          <p style={{ margin: '4px 0 0', color: '#444' }}>Live, consent-filtered prescriptions with case context.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ background: '#0b0c0c', color: '#fff', padding: '10px 14px', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>GRANTED</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{totals.granted}</div>
          </div>
          <div style={{ background: '#f3f2f1', color: '#0b0c0c', padding: '10px 14px', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>REQUESTED</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{totals.pending}</div>
          </div>
          <div style={{ background: '#f7d7db', color: '#a61e1e', padding: '10px 14px', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 12, opacity: 0.8 }}>REVOKED</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{totals.revoked}</div>
          </div>
        </div>
      </header>

      <section style={{ background: '#fff', border: '1px solid #dcdcdc', borderRadius: 12, padding: 14, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Cases ({totals.total})</h2>
          <button onClick={() => refresh(selected)} style={{ padding: '8px 12px' }}>Refresh now</button>
        </div>
        <p style={{ color: '#555', marginTop: 6 }}>A case is <strong>Requested</strong> until the citizen approves in the Wallet.</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', paddingBottom: 6 }}>Case</th>
              <th style={{ textAlign: 'left', paddingBottom: 6 }}>Citizen</th>
              <th style={{ textAlign: 'left', paddingBottom: 6 }}>Latest</th>
              <th style={{ textAlign: 'left', paddingBottom: 6 }}>Status</th>
              <th style={{ textAlign: 'left', paddingBottom: 6 }}></th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.caseId} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: '8px 4px' }}><strong>{c.caseId}</strong></td>
                <td style={{ padding: '8px 4px' }}>{c.citizenId}</td>
                <td style={{ padding: '8px 4px', color: '#444' }}>{c.latestPrescription || '—'}</td>
                <td style={{ padding: '8px 4px' }}>{badge(c.status)}</td>
                <td style={{ padding: '8px 4px' }}><button onClick={() => setSelected(c.caseId)}>Open</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {cases.length === 0 && <p style={{ marginTop: 10 }}>No cases yet.</p>}
      </section>

      {detail && (
        <section style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid #dcdcdc', borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0 }}>Case {detail.caseId}</h2>
              {badge(detail.status)}
            </div>
            <p style={{ marginTop: 6, color: '#555' }}>Citizen <strong>{detail.citizenId}</strong></p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
              <Info label="Requested" value={formatTime(detail.requestedAt)} />
              <Info label="Last event" value={formatTime(detail.lastEventAt)} />
              <Info label="Expires" value={detail.expiresAt ? new Date(detail.expiresAt).toLocaleDateString() : '—'} />
              <Info label="Last view" value={detail.lastViewAt ? new Date(detail.lastViewAt).toLocaleString() : '—'} />
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: '#6c6f73', textTransform: 'uppercase', letterSpacing: 0.5 }}>Scopes</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {(detail.scopes && detail.scopes.length > 0 ? detail.scopes : ['prescriptions']).map((s) => (
                  <span key={s} style={{ background: '#f3f2f1', padding: '6px 10px', borderRadius: 20, fontSize: 12 }}>{s}</span>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, color: '#6c6f73', textTransform: 'uppercase', letterSpacing: 0.5 }}>Latest</div>
              <p style={{ margin: '4px 0', color: '#444' }}>{detail.latestPrescription || 'No prescriptions received yet.'}</p>
              <p style={{ margin: '4px 0', color: '#666' }}>Total filtered rows: {detail.totalPrescriptions || 0}</p>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #dcdcdc', borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Consent-filtered prescriptions</h3>
              <span style={{ fontSize: 12, color: '#666' }}>Live feed · auto-refresh</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', paddingBottom: 6 }}>Time</th>
                  <th style={{ textAlign: 'left', paddingBottom: 6 }}>Patient</th>
                  <th style={{ textAlign: 'left', paddingBottom: 6 }}>Drug</th>
                  <th style={{ textAlign: 'left', paddingBottom: 6 }}>Dose</th>
                  <th style={{ textAlign: 'left', paddingBottom: 6 }}>Repeats</th>
                  <th style={{ textAlign: 'left', paddingBottom: 6 }}>Prescriber</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #f1f1f1' }}>
                    <td style={{ padding: '8px 4px' }}>{new Date(r.ts).toLocaleTimeString()}</td>
                    <td style={{ padding: '8px 4px' }}>{r.v.patientId}</td>
                    <td style={{ padding: '8px 4px' }}>{r.v.prescription.drug}</td>
                    <td style={{ padding: '8px 4px' }}>{r.v.prescription.dose}</td>
                    <td style={{ padding: '8px 4px' }}>{r.v.prescription.repeats}</td>
                    <td style={{ padding: '8px 4px' }}>{r.v.prescription.prescriber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p style={{ marginTop: 8 }}>No data yet. Grant consent to start streaming.</p>}
          </div>
        </section>
      )}
    </div>
  );
}

type InfoProps = { label: string; value: string };
function Info({ label, value }: InfoProps) {
  return (
    <div style={{ background: '#f9f9f8', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 12, color: '#6c6f73', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ marginTop: 4 }}>{value}</div>
    </div>
  );
}
