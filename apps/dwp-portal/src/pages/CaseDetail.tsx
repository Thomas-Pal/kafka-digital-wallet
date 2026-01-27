import React, { useEffect, useState } from 'react';
import EvidenceList from '../components/EvidenceList';
import Timeline from '../components/Timeline';
import { DWP_API_BASE } from '../config';

type CaseDetail = {
  caseId: string;
  citizenId: string;
  caseType: string;
  status: string;
  evidence: { type: string; summary: string; details: Record<string, unknown> }[];
  timeline: { id: string; label: string; at: string }[];
};

export default function CaseDetail({ caseId, onBack }: { caseId: string; onBack: () => void }) {
  const [detail, setDetail] = useState<CaseDetail | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const response = await fetch(`${DWP_API_BASE}/api/case/${encodeURIComponent(caseId)}`)
        .then((r) => r.json())
        .catch(() => null);
      if (active) setDetail(response);
    };
    load();
    const interval = setInterval(load, 2500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [caseId]);

  if (!detail) {
    return (
      <div className="container">
        <button className="link-button" onClick={onBack}>
          ← Back to cases
        </button>
        <p>Loading case details…</p>
      </div>
    );
  }

  return (
    <div className="container">
      <button className="link-button" onClick={onBack}>
        ← Back to cases
      </button>
      <header className="page-header">
        <div>
          <h1>Case {detail.caseId}</h1>
          <p className="muted">Citizen {detail.citizenId}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge badge-blue">{detail.caseType}</span>
        </div>
      </header>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Citizen summary</h3>
        <div className="grid">
          <div className="mini-card">
            <div className="mini-label">Status</div>
            <div>{detail.status}</div>
          </div>
        </div>
      </div>

      <div className="grid-two">
        <div>
          <h3>Evidence</h3>
          <EvidenceList items={detail.evidence} />
        </div>
        <div>
          <h3>Timeline</h3>
          <Timeline items={detail.timeline} />
        </div>
      </div>
    </div>
  );
}
