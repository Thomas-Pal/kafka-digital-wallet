import React, { useEffect, useState } from 'react';
type CaseRow = { caseId:string; citizenId:string; status:'requested'|'granted'|'revoked' };

export default function App(){
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<string|undefined>(undefined);

  useEffect(()=>{ const t=setInterval(async()=>{
    const r = await fetch('http://localhost:5001/api/cases'); setCases(await r.json());
    if (selected) {
      const v = await fetch(`http://localhost:5001/api/case/${selected}/view`);
      setRows(await v.json());
    }
  }, 1200); return ()=>clearInterval(t); }, [selected]);

  function badge(s:CaseRow['status']){
    const color = s==='granted' ? '#0a7d2b' : s==='requested' ? '#b36b00' : '#a61e1e';
    return <span style={{background:color,color:'#fff',padding:'3px 8px',borderRadius:6,fontSize:12}}>{s}</span>;
  }

  return (
    <div style={{maxWidth:1000, margin:'30px auto', fontFamily:'system-ui'}}>
      <h1 style={{marginBottom:8}}>DWP Portal</h1>
      <p>Cases for this team. A case is <strong>Requested</strong> until the citizen approves in the Wallet.</p>
      <h2>Cases</h2>
      <table style={{width:'100%', borderCollapse:'collapse', marginBottom:20}}>
        <thead><tr><th style={{textAlign:'left'}}>Case</th><th>Citizen</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {cases.map(c=>(
            <tr key={c.caseId}>
              <td>{c.caseId}</td><td>{c.citizenId}</td><td>{badge(c.status)}</td>
              <td><button onClick={()=>setSelected(c.caseId)}>Open</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && (<>
        <h2>Case {selected} — Consent-filtered prescriptions</h2>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead><tr><th style={{textAlign:'left'}}>Time</th><th>Patient</th><th>Drug</th><th>Dose</th><th>Repeats</th><th>Prescriber</th></tr></thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i}>
                <td>{new Date(r.ts).toLocaleTimeString()}</td>
                <td>{r.v.patientId}</td>
                <td>{r.v.prescription.drug}</td>
                <td>{r.v.prescription.dose}</td>
                <td>{r.v.prescription.repeats}</td>
                <td>{r.v.prescription.prescriber}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>)}
    </div>
  );
}
