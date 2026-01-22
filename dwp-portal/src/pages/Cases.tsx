import React, { useEffect, useMemo, useState } from 'react';

type CaseRow = { caseId: string; citizenId: string; type: 'nhs' | 'termination'; consent: 'pending' | 'granted' | 'expired' };

const badgeStyle: Record<CaseRow['consent'], { background: string; label: string }> = {
  pending: { background: '#b36b00', label: 'Pending' },
  granted: { background: '#0a7d2b', label: 'Granted' },
  expired: { background: '#a61e1e', label: 'Expired' }
};

export default function Cases() {
  const [rows, setRows] = useState<CaseRow[]>([
    { caseId: '9001', citizenId: 'nhs-999', type: 'nhs', consent: 'pending' },
    { caseId: 'TERM-1001', citizenId: 'emp-999', type: 'termination', consent: 'pending' }
  ]);
  useEffect(() => {
    const t = setInterval(async () => {
      const r = await fetch('http://localhost:5001/api/consent-status').then((x) => x.json()).catch(() => ({}));
      if (r && Array.isArray(r)) setRows(r);
    }, 2000);
    return () => clearInterval(t);
  }, []);

  const totals = useMemo(() => ({
    total: rows.length,
    granted: rows.filter((c) => c.consent === 'granted').length,
    expired: rows.filter((c) => c.consent === 'expired').length,
    pending: rows.filter((c) => c.consent === 'pending').length
  }), [rows]);

  function badge(s: CaseRow['consent']) {
    const { background, label } = badgeStyle[s];
    return <span style={{ background, color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: 12 }}>{label}</span>;
  }

  return (
    <div style={{ maxWidth: 1100, margin: '28px auto', fontFamily: 'system-ui', padding: '0 16px 24px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: '#6c6f73', letterSpacing: 1 }}>PORTAL</div>
          <h1 style={{ margin: '4px 0 0' }}>DWP Case Viewer</h1>
          <p style={{ margin: '4px 0 0', color: '#444' }}>Live, consent-filtered case data with rich event detail.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <StatCard label="GRANTED" value={totals.granted} background="#0b0c0c" color="#fff" />
          <StatCard label="PENDING" value={totals.pending} background="#f3f2f1" color="#0b0c0c" />
          <StatCard label="EXPIRED" value={totals.expired} background="#f7d7db" color="#a61e1e" />
        </div>
      </header>

      <section style={{ background: '#fff', border: '1px solid #dcdcdc', borderRadius: 12, padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ margin: 0 }}>Cases ({totals.total})</h2>
          <span style={{ fontSize: 12, color: '#666' }}>Auto-refreshing every 2 seconds</span>
        </div>
        <p style={{ color: '#555', marginTop: 6 }}>Consent status flips to <strong>Granted</strong> once the wallet approves the request.</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', paddingBottom: 6 }}>Case</th>
              <th style={{ textAlign: 'left', paddingBottom: 6 }}>Citizen</th>
              <th style={{ textAlign: 'left', paddingBottom: 6 }}>Type</th>
              <th style={{ textAlign: 'left', paddingBottom: 6 }}>Consent</th>
              <th style={{ textAlign: 'left', paddingBottom: 6 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.caseId} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: '8px 4px' }}><strong>{r.caseId}</strong></td>
                <td style={{ padding: '8px 4px' }}>{r.citizenId}</td>
                <td style={{ padding: '8px 4px', textTransform: 'capitalize' }}>{r.type}</td>
                <td style={{ padding: '8px 4px' }}>{badge(r.consent)}</td>
                <td style={{ padding: '8px 4px' }}>
                  <a href={`/case/${encodeURIComponent(r.caseId)}`} style={{ textDecoration: 'none' }}>
                    <button>Open</button>
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p style={{ marginTop: 10 }}>No cases yet.</p>}
      </section>
    </div>
  );
}

type StatCardProps = { label: string; value: number; background: string; color: string };
function StatCard({ label, value, background, color }: StatCardProps) {
  return (
    <div style={{ background, color, padding: '10px 14px', borderRadius: 10, textAlign: 'center', minWidth: 110 }}>
      <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
