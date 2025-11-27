import React, { useState } from 'react';

const Case = { rp: 'dwp', caseId: '4711', citizenId: 'nhs-999', scopes: ['prescriptions'] };

export default function App() {
  const [status, setStatus] = useState<'idle' | 'granted' | 'revoked'>('idle');

  async function grant() {
    await fetch('http://localhost:4000/consent/grant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...Case, ttlDays: 90 })
    });
    setStatus('granted');
  }

  async function revoke() {
    await fetch('http://localhost:4000/consent/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(Case)
    });
    setStatus('revoked');
  }

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 36, marginBottom: 8 }}>GOV.UK One Login</h1>
      <p style={{ color: '#555' }}>Approve data sharing for your DWP case.</p>
      <div style={{ border: '3px solid #1d70b8', padding: 24, borderRadius: 8, background: '#f3f2f1', marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Share your NHS prescriptions</h2>
        <ul>
          <li>
            Recipient: <strong>DWP</strong>
          </li>
          <li>
            Data: <strong>Prescriptions only</strong>
          </li>
          <li>
            Duration: <strong>3 months</strong> (auto-expires)
          </li>
        </ul>
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <button
            onClick={grant}
            style={{ background: '#00703c', color: '#fff', padding: '12px 20px', fontWeight: 700, border: 0 }}
          >
            Allow
          </button>
          <button
            onClick={revoke}
            style={{ background: '#d4351c', color: '#fff', padding: '12px 20px', fontWeight: 700, border: 0 }}
          >
            Revoke
          </button>
        </div>
        <p style={{ marginTop: 12 }}>
          Status: <strong>{status}</strong>
        </p>
      </div>
    </div>
  );
}
