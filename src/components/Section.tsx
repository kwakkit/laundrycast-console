import type { ReactNode } from 'react';

export function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>{title}</h2>
        {note && <span className="muted small">{note}</span>}
      </div>
      {children}
    </section>
  );
}
