import React, { useEffect, useState } from 'react';

type CaseRow = { caseId: string; citizenId: string; type: 'nhs' | 'termination'; consent: 'pending' | 'granted' | 'expired' };

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
  return (
    <div style={{ padding: 16 }}>
      <h2>Cases</h2>
      <table>
        <thead><tr><th>Case</th><th>Citizen</th><th>Type</th><th>Consent</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.caseId}>
              <td><a href={`/case/${encodeURIComponent(r.caseId)}`}>{r.caseId}</a></td>
              <td>{r.citizenId}</td>
              <td>{r.type}</td>
              <td>{r.consent}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
