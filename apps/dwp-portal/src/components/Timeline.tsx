import React from 'react';

type TimelineItem = {
  id: string;
  label: string;
  at: string;
};

type TimelineProps = {
  items: TimelineItem[];
};

export default function Timeline({ items }: TimelineProps) {
  if (items.length === 0) {
    return <p>No timeline entries yet.</p>;
  }

  return (
    <ul className="timeline">
      {items.map((item) => (
        <li key={item.id}>
          <div className="timeline-dot" />
          <div>
            <strong>{item.label}</strong>
            <div className="muted">{new Date(item.at).toLocaleString()}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
