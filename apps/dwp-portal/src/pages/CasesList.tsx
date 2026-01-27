import React, { useEffect, useState } from 'react';
import CaseRow from '../components/CaseRow';
import { DWP_API_BASE } from '../config';

type CaseSummary = {
  caseId: string;
  citizenId: string;
  caseType: string;
  status: string;
  lastUpdate?: string;
  evidenceCount: number;
};

export default function CasesList({ onOpen }: { onOpen: (id: string) => void }) {
  const [cases, setCases] = useState<CaseSummary[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const casesRes = await fetch(`${DWP_API_BASE}/api/cases`).then((r) => r.json()).catch(() => []);
      if (!active) return;
      setCases(Array.isArray(casesRes) ? casesRes : []);
    };
    load();
    const interval = setInterval(load, 2500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const total = cases.length;
  const ready = cases.filter((item) => item.status === 'ready-to-assess').length;
  const awaiting = total - ready;

  return (
    <div className="container">
      <header className="page-header">
        <div>
          <h1>DWP Casework Portal</h1>
          <p className="muted">Cases appear only after citizen consent and matching RAW evidence.</p>
        </div>
        <div className="stat-group">
          <div className="stat">
            <span>Total</span>
            <strong>{total}</strong>
          </div>
          <div className="stat">
            <span>Ready to assess</span>
            <strong>{ready}</strong>
          </div>
          <div className="stat">
            <span>Awaiting evidence</span>
            <strong>{awaiting}</strong>
          </div>
        </div>
      </header>

      {cases.length === 0 ? (
        <div className="empty">
          <h2>No cases yet</h2>
          <p>Waiting for consent grants and matched evidence.</p>
        </div>
      ) : (
        <div className="card">
          <table className="cases-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Citizen</th>
                <th>Case Type</th>
                <th>Status</th>
                <th>Last Update</th>
                <th>Evidence</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cases.map((row) => (
                <CaseRow key={row.caseId} {...row} onOpen={onOpen} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
