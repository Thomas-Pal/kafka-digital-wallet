import React, { useEffect, useMemo, useState } from 'react';

type ConsentReq = { rp:string; caseId:string; citizenId:string; scopes:string[]; issuedAt:string; consentId:string };
type HistoryItem = { caseId:string; action:'granted'|'revoked'; at:string };

const citizenId = 'nhs-999';

export default function App(){
  const [pending, setPending] = useState<ConsentReq[]>([]);
  const [status, setStatus] = useState<string>('idle');
  const [history, setHistory] = useState<HistoryItem[]>([]);

  async function loadPending(){
    const r = await fetch(`http://localhost:4000/consent/pending?citizenId=${citizenId}`);
    setPending(await r.json());
  }
  useEffect(()=>{ loadPending(); const t=setInterval(loadPending, 1200); return ()=>clearInterval(t); },[]);

  function record(action:HistoryItem['action'], caseId:string){
    setHistory((h)=>[{ caseId, action, at:new Date().toISOString() }, ...h].slice(0, 5));
  }

  async function grant(caseId:string){
    await fetch('http://localhost:4000/consent/grant', {
      method:'POST', headers:{'content-type':'application/json'},
      body: JSON.stringify({ rp:'dwp', caseId, citizenId, scopes:['prescriptions'], ttlDays:90 })
    });
    setStatus(`granted case ${caseId}`);
    record('granted', caseId);
    await loadPending();
  }
  async function revoke(caseId:string){
    await fetch('http://localhost:4000/consent/revoke', {
      method:'POST', headers:{'content-type':'application/json'},
      body: JSON.stringify({ rp:'dwp', caseId, citizenId })
    });
    setStatus(`revoked case ${caseId}`);
    record('revoked', caseId);
    await loadPending();
  }

  const highlight = useMemo(()=>pending[0], [pending]);

  return (
    <div style={{maxWidth:900, margin:'30px auto', fontFamily:'system-ui'}}>
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
        <div>
          <div style={{fontSize:12, color:'#6c6f73', letterSpacing:1}}>WALLET</div>
          <h1 style={{margin:'4px 0 0'}}>GOV.UK One Login</h1>
          <p style={{margin:'4px 0 0', color:'#444'}}>Approve or revoke data sharing requests for your care data.</p>
        </div>
        <div style={{textAlign:'right', fontSize:14}}>
          <div style={{fontWeight:600}}>{citizenId}</div>
          <div style={{color:'#666'}}>Signed in as patient</div>
        </div>
      </header>

      {highlight && (
        <div style={{background:'#0b0c0c', color:'#fff', padding:16, borderRadius:10, marginBottom:20, display:'flex', gap:18, alignItems:'center'}}>
          <div style={{fontSize:13, letterSpacing:0.5, opacity:0.8}}>NEXT ACTION</div>
          <div style={{flex:1}}>
            <div style={{fontSize:18, fontWeight:700}}>Case {highlight.caseId} from {highlight.rp.toUpperCase()}</div>
            <div style={{fontSize:14, opacity:0.9}}>Scope: {highlight.scopes?.join(', ') || 'prescriptions'} · Requested {new Date(highlight.issuedAt).toLocaleString()}</div>
          </div>
          <div style={{display:'flex', gap:8}}>
            <button className="btn-allow" onClick={()=>grant(highlight.caseId)}>Grant for 90 days</button>
            <button className="btn-revoke" onClick={()=>revoke(highlight.caseId)}>Decline</button>
          </div>
        </div>
      )}

      <div className="gov-box">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
          <h2 style={{margin:0}}>Pending requests</h2>
          <small style={{color:'#666'}}>Auto-refreshing</small>
        </div>
        {pending.length === 0 && <p>No pending requests right now.</p>}
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:12}}>
          {pending.map(req => (
            <div key={req.consentId} className="request" style={{border:'1px solid #dcdcdc', borderRadius:10, padding:12}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div><strong>{req.rp.toUpperCase()}</strong> · Case {req.caseId}</div>
                <span style={{background:'#f3f2f1', padding:'4px 8px', borderRadius:6, fontSize:12}}>{new Date(req.issuedAt).toLocaleTimeString()}</span>
              </div>
              <div style={{margin:'8px 0', color:'#555'}}>Request to view: <strong>{(req.scopes || ['prescriptions']).join(', ')}</strong></div>
              <div style={{fontSize:12, color:'#6c6f73'}}>Citizen ID: {req.citizenId}</div>
              <div style={{marginTop:10, display:'flex', gap:8}}>
                <button className="btn-allow" onClick={()=>grant(req.caseId)}>Grant 90 days</button>
                <button className="btn-revoke" onClick={()=>revoke(req.caseId)}>Revoke</button>
              </div>
            </div>
          ))}
        </div>
        <p style={{marginTop:12}}>Status: <strong>{status}</strong></p>
      </div>

      <div className="gov-box" style={{marginTop:16}}>
        <h2 style={{marginTop:0}}>Recent actions</h2>
        {history.length === 0 && <p>No recent actions.</p>}
        {history.length > 0 && (
          <ul style={{paddingLeft:18, margin:0}}>
            {history.map((h,i)=>(
              <li key={i} style={{marginBottom:4}}>
                {h.action === 'granted' ? '✅ Granted' : '🚫 Revoked'} case <strong>{h.caseId}</strong> at {new Date(h.at).toLocaleTimeString()}
              </li>
            ))}
          </ul>
        )}
        <p style={{marginTop:12, color:'#666'}}>Use this wallet to stay in control of who can see your prescriptions.</p>
      </div>
    </div>
  );
}
