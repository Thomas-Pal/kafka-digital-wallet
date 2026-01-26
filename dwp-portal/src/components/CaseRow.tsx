import React from 'react';

type CaseRowProps = {
  caseId: string;
  citizenId: string;
  caseType: string;
  status: string;
  lastUpdate?: string;
  evidenceCount: number;
  slaBreached?: boolean;
  onOpen: (id: string) => void;
};

export default function CaseRow({ caseId, citizenId, caseType, status, lastUpdate, evidenceCount, slaBreached, onOpen }: CaseRowProps) {
  return (
    <tr>
      <td>{caseId}</td>
      <td>{citizenId}</td>
      <td>
        <span className="badge badge-blue">{caseType}</span>
      </td>
      <td>
        <span className={`badge badge-${status === 'ready-to-assess' ? 'green' : 'amber'}`}>{status}</span>
        {slaBreached && <span className="badge badge-red" style={{ marginLeft: 8 }}>SLA</span>}
      </td>
      <td>{lastUpdate ? new Date(lastUpdate).toLocaleString() : '—'}</td>
      <td>{evidenceCount}</td>
      <td>
        <button className="link-button" onClick={() => onOpen(caseId)}>
          Open
        </button>
      </td>
    </tr>
  );
}
