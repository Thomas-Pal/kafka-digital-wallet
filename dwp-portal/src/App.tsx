import React, { useEffect, useState } from 'react';

export default function App() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    const timer = setInterval(async () => {
      const response = await fetch('http://localhost:5001/api/case/4711/view');
      setRows(await response.json());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 32 }}>DWP Case #4711 – Consent-filtered prescriptions</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Time</th>
            <th>Patient</th>
            <th>Drug</th>
            <th>Dose</th>
            <th>Repeats</th>
            <th>Prescriber</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
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
    </div>
  );
}
