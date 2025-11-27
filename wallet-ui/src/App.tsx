import React, { useEffect, useState } from 'react';

const Case = { rp: 'dwp', caseId: '4711', citizenId: 'nhs-999', scopes: ['prescriptions'] };

type Status = 'not_requested' | 'requested' | 'granted' | 'revoked';

export default function App() {
  const [status, setStatus] = useState<Status>('not_requested');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      const res = await fetch(
        `http://localhost:4000/consent/status/${Case.rp}/${Case.caseId}/${Case.citizenId}`
      );
      const body = await res.json();
      setStatus(body.status);
      setLastUpdated(body.lastUpdated);
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

  const hasRequest = status !== 'not_requested';

  const badge = (
    <span
      style={{
        padding: '6px 10px',
        borderRadius: 16,
        fontWeight: 700,
        background: status === 'granted' ? '#cce2d8' : status === 'revoked' ? '#f6d7d2' : '#dfe1e0',
        color: '#0b0c0c',
        fontSize: 14
      }}
    >
      {status === 'granted' && 'Granted'}
      {status === 'revoked' && 'Revoked'}
      {status === 'requested' && 'Awaiting your decision'}
      {status === 'not_requested' && 'No request yet'}
    </span>
  );

  return (
    <div style={{ maxWidth: 900, margin: '32px auto 80px', fontFamily: 'GDS Transport, system-ui', padding: '0 20px' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 6,
            background: '#1d70b8',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: 18
          }}
        >
          DW
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>UK Digital Wallet</div>
          <div style={{ color: '#505a5f' }}>Securely decide where your data flows.</div>
        </div>
      </header>

      <div style={{ background: '#0b0c0c', color: '#fff', padding: 20, borderRadius: 10, marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Consent requests</div>
        <div style={{ marginTop: 6, color: '#dfe1e0' }}>
          You are in control. Approve or refuse requests from relying parties before anything is shared.
        </div>
      </div>

      {!hasRequest && (
        <div
          style={{
            background: '#fff',
            border: '2px solid #b1b4b6',
            borderRadius: 10,
            padding: 18,
            boxShadow: '0 4px 0 rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>No data sharing requests right now</div>
          <p style={{ margin: '6px 0 0', color: '#505a5f' }}>
            We will alert you here when DWP (or another service) asks to view specific information.
          </p>
        </div>
      )}

      {hasRequest && (
        <div
          style={{
            background: '#fff',
            border: '3px solid #1d70b8',
            padding: 22,
            borderRadius: 12,
            boxShadow: '0 6px 0 rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 14, color: '#505a5f' }}>Request from</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>Department for Work and Pensions</div>
            </div>
            {badge}
          </div>

          <div style={{ marginTop: 10, color: '#0b0c0c' }}>
            <div style={{ fontWeight: 700 }}>Case #{Case.caseId}</div>
            <ul style={{ paddingLeft: 20, marginTop: 8, marginBottom: 10, color: '#505a5f', lineHeight: 1.5 }}>
              <li>Citizen ID: {Case.citizenId}</li>
              <li>Data requested: NHS prescriptions only</li>
              <li>Access duration: 3 months (auto-expires)</li>
            </ul>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button
              onClick={grant}
              disabled={status !== 'requested' && status !== 'revoked'}
              style={{
                background: status === 'requested' || status === 'revoked' ? '#00703c' : '#b1b4b6',
                color: '#fff',
                padding: '12px 20px',
                fontWeight: 800,
                border: 0,
                flex: 1
              }}
            >
              Allow access
            </button>
            <button
              onClick={revoke}
              disabled={status !== 'granted'}
              style={{
                background: status === 'granted' ? '#d4351c' : '#b1b4b6',
                color: '#fff',
                padding: '12px 20px',
                fontWeight: 800,
                border: 0,
                flex: 1
              }}
            >
              Stop sharing
            </button>
          </div>

          <div style={{ marginTop: 14, color: '#505a5f', fontSize: 14 }}>
            {status === 'requested' && 'Only share if you are comfortable. You can change your mind at any time.'}
            {status === 'granted' && 'Sharing is active. The portal only sees your prescriptions for this case.'}
            {status === 'revoked' && 'Sharing stopped. No new data will flow.'}
          </div>

          {lastUpdated && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#6f777b' }}>Last updated: {new Date(lastUpdated).toLocaleTimeString()}</div>
          )}
        </div>
      )}
    </div>
  );
}
