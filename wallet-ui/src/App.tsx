import React, { useEffect, useState } from 'react';
type ConsentReq = { rp:string; caseId:string; citizenId:string; scopes:string[]; issuedAt:string; consentId:string };
const citizenId = 'nhs-999';

export default function App(){
  const [pending, setPending] = useState<ConsentReq[]>([]);
  const [status, setStatus] = useState<string>('idle');

  async function loadPending(){
    const r = await fetch(`http://localhost:4000/consent/pending?citizenId=${citizenId}`);
    setPending(await r.json());
  }
  useEffect(()=>{ loadPending(); const t=setInterval(loadPending, 1200); return ()=>clearInterval(t); },[]);

  async function grant(caseId:string){
    await fetch('http://localhost:4000/consent/grant', {
      method:'POST', headers:{'content-type':'application/json'},
      body: JSON.stringify({ rp:'dwp', caseId, citizenId, scopes:['prescriptions'], ttlDays:90 })
    });
    setStatus(`granted case ${caseId}`); await loadPending();
  }
  async function revoke(caseId:string){
    await fetch('http://localhost:4000/consent/revoke', {
      method:'POST', headers:{'content-type':'application/json'},
      body: JSON.stringify({ rp:'dwp', caseId, citizenId })
    });
    setStatus(`revoked case ${caseId}`); await loadPending();
  }

  return (
    <div style={{maxWidth:760, margin:'30px auto'}}>
      <h1>GOV.UK One Login</h1>
      <p><small>Approve or revoke data sharing requests</small></p>
      <div className="gov-box">
        <h2>Pending requests</h2>
        {pending.length === 0 && <p>No pending requests.</p>}
        {pending.map(req => (
          <div key={req.consentId} className="request">
            <div><strong>Requester:</strong> {req.rp.toUpperCase()}</div>
            <div><strong>Case:</strong> {req.caseId} &nbsp; <strong>Data:</strong> Prescriptions only</div>
            <div style={{marginTop:8, display:'flex', gap:8}}>
              <button className="btn-allow" onClick={()=>grant(req.caseId)}>Allow (3 months)</button>
              <button className="btn-revoke" onClick={()=>revoke(req.caseId)}>Decline</button>
            </div>
          </div>
        ))}
        <p style={{marginTop:12}}>Status: <strong>{status}</strong></p>
      </div>
    </div>
  );
}
