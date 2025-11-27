import React, { useEffect, useState } from 'react';

const API = 'http://localhost:5001';

type CaseRow = {
  caseId: string;
  citizenId: string;
  citizenName: string;
  consentRequested: boolean;
  consentStatus: string;
  lastConsentEvent: string | null;
  latestPrescription: string | null;
};

type ViewRow = { ts: number; v: any };

export default function App() {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [selectedCase, setSelectedCase] = useState<string>('');
  const [viewRows, setViewRows] = useState<ViewRow[]>([]);

  useEffect(() => {
    const t = setInterval(async () => {
      const res = await fetch(`${API}/api/cases`);
      const data = await res.json();
      setCases(data);
      if (!selectedCase && data.length) setSelectedCase(data[0].caseId);
    }, 1000);
    return () => clearInterval(t);
  }, [selectedCase]);

  useEffect(() => {
    if (!selectedCase) return;
    const t = setInterval(async () => {
      const res = await fetch(`${API}/api/case/${selectedCase}/view`);
      if (res.ok) setViewRows(await res.json());
    }, 1000);
    return () => clearInterval(t);
  }, [selectedCase]);

  async function requestConsent(caseId: string) {
    await fetch(`${API}/api/case/${caseId}/request-consent`, { method: 'POST' });
  }

  return (
    <div style={{ maxWidth: 960, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>DWP Portal – consent-filtered cases</h1>
      <p style={{ color: '#444', marginTop: 0 }}>Pick a case, send a consent request, and watch prescriptions flow only after approval.</p>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))' }}>
        {cases.map((c) => (
          <div key={c.caseId} style={{ border: '1px solid #d0d0d0', padding: 16, borderRadius: 8, background: selectedCase === c.caseId ? '#f0f8ff' : '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700 }}>Case #{c.caseId}</div>
                <div style={{ color: '#555' }}>{c.citizenName} ({c.citizenId})</div>
              </div>
              <span style={{ padding: '4px 8px', borderRadius: 12, background: '#f3f2f1', fontSize: 12, fontWeight: 700 }}>
                {c.consentStatus === 'granted' && '✅ Granted'}
                {c.consentStatus === 'revoked' && '⛔ Revoked'}
                {c.consentStatus === 'requested' && '📨 Requested'}
                {c.consentStatus === 'not_requested' && '⚪ Not requested'}
              </span>
            </div>
            <div style={{ marginTop: 8, color: '#555', fontSize: 14 }}>
              {c.consentRequested ? 'Consent request has been sent.' : 'No consent request yet.'}
              {c.latestPrescription && <div style={{ marginTop: 4 }}>Latest: {c.latestPrescription}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={() => setSelectedCase(c.caseId)} style={{ flex: 1, padding: '8px 10px', fontWeight: 700, border: selectedCase === c.caseId ? '2px solid #1d70b8' : '1px solid #1d70b8', background: '#fff' }}>
                View
              </button>
              <button onClick={() => requestConsent(c.caseId)} style={{ flex: 1, padding: '8px 10px', fontWeight: 700, border: '1px solid #1d70b8', background: '#1d70b8', color: '#fff' }}>
                Send consent request
              </button>
            </div>
            {c.lastConsentEvent && <div style={{ marginTop: 6, fontSize: 12, color: '#777' }}>Last change: {new Date(c.lastConsentEvent).toLocaleTimeString()}</div>}
          </div>
        ))}
      </div>

      {selectedCase && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ marginBottom: 8 }}>Case #{selectedCase} – permitted prescriptions</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '2px solid #ccc' }}>Time</th>
                <th style={{ borderBottom: '2px solid #ccc' }}>Patient</th>
                <th style={{ borderBottom: '2px solid #ccc' }}>Drug</th>
                <th style={{ borderBottom: '2px solid #ccc' }}>Dose</th>
                <th style={{ borderBottom: '2px solid #ccc' }}>Repeats</th>
                <th style={{ borderBottom: '2px solid #ccc' }}>Prescriber</th>
              </tr>
            </thead>
            <tbody>
              {viewRows.map((r, i) => (
                <tr key={i}>
                  <td style={{ padding: '6px 4px' }}>{new Date(r.ts).toLocaleTimeString()}</td>
                  <td style={{ padding: '6px 4px' }}>{r.v.patientId}</td>
                  <td style={{ padding: '6px 4px' }}>{r.v.prescription.drug}</td>
                  <td style={{ padding: '6px 4px' }}>{r.v.prescription.dose}</td>
                  <td style={{ padding: '6px 4px' }}>{r.v.prescription.repeats}</td>
                  <td style={{ padding: '6px 4px' }}>{r.v.prescription.prescriber}</td>
                </tr>
              ))}
              {!viewRows.length && (
                <tr>
                  <td colSpan={6} style={{ padding: '10px 4px', color: '#555' }}>
                    Waiting for consent + filtered events...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
