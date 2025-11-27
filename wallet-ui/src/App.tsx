import React, { useEffect, useState } from 'react';

const Case = { rp: 'dwp', caseId: '4711', citizenId: 'nhs-999', scopes: ['prescriptions'] };

export default function App() {
  const [status, setStatus] = useState<'not_requested' | 'requested' | 'granted' | 'revoked'>('not_requested');

  useEffect(() => {
    const fetchStatus = async () => {
      const res = await fetch(
        `http://localhost:4000/consent/status/${Case.rp}/${Case.caseId}/${Case.citizenId}`
      );
      const body = await res.json();
      setStatus(body.status);
    };
    fetchStatus();
    const t = setInterval(fetchStatus, 1000);
    return () => clearInterval(t);
  }, []);

  async function grant() {
    await fetch('http://localhost:4000/consent/grant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...Case, ttlDays: 90 })
    });
  }

  async function revoke() {
    await fetch('http://localhost:4000/consent/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(Case)
    });
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
        <p style={{ marginTop: 0, color: '#555' }}>
          Request status: <strong>{status.replace('_', ' ')}</strong>
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button
            onClick={grant}
            disabled={status === 'not_requested'}
            style={{
              background: status === 'not_requested' ? '#b1b4b6' : '#00703c',
              color: '#fff',
              padding: '12px 20px',
              fontWeight: 700,
              border: 0
            }}
          >
            Allow
          </button>
          <button
            onClick={revoke}
            disabled={status !== 'granted'}
            style={{
              background: status !== 'granted' ? '#b1b4b6' : '#d4351c',
              color: '#fff',
              padding: '12px 20px',
              fontWeight: 700,
              border: 0
            }}
          >
            Revoke
          </button>
        </div>
        <p style={{ marginTop: 12 }}>
          Next step: {status === 'not_requested' ? 'Waiting for DWP to request consent.' : status === 'requested' ? 'Respond to the request.' : 'You can change your decision anytime.'}
        </p>
      </div>
    </div>
  );
}
