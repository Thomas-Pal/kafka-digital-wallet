import React from 'react';

type Evidence = {
  type: string;
  summary: string;
  details: Record<string, unknown>;
};

type EvidenceListProps = {
  items: Evidence[];
};

export default function EvidenceList({ items }: EvidenceListProps) {
  if (items.length === 0) {
    return <p>No evidence received yet.</p>;
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {items.map((item, index) => (
        <div key={`${item.type}-${index}`} className="card">
          <h4>{item.type}</h4>
          <p>{item.summary}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {Object.entries(item.details).map(([key, value]) => (
              <div key={key} className="mini-card">
                <div className="mini-label">{key}</div>
                <div>{String(value)}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
