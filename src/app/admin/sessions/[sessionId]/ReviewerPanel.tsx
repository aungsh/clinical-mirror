'use client';

import { useState } from 'react';
import type { RubricAssessment, RubricOverride, SessionReview } from '@/lib/types';

export function ReviewerPanel({ sessionId, rubrics, existing }: { sessionId: string; rubrics: RubricAssessment[]; existing: SessionReview | null }) {
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [overrides, setOverrides] = useState<RubricOverride[]>(existing?.overrides ?? []);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  function updateOverride(rubricId: string, value: string) {
    const next = value === '' ? null : Math.max(0, Math.min(10, Math.round(Number(value))));
    setOverrides((current) => {
      const existingOverride = current.find((item) => item.rubricId === rubricId);
      if (next === null) return current.filter((item) => item.rubricId !== rubricId);
      if (existingOverride) return current.map((item) => item.rubricId === rubricId ? { ...item, score: next } : item);
      return [...current, { rubricId, score: next, rationale: '' }];
    });
  }

  function updateRationale(rubricId: string, rationale: string) {
    setOverrides((current) => current.map((item) => item.rubricId === rubricId ? { ...item, rationale } : item));
  }

  async function save() {
    setSaving(true); setStatus('');
    const response = await fetch(`/api/admin/sessions/${sessionId}/review`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes, overrides }),
    });
    const result = await response.json().catch(() => ({}));
    setStatus(response.ok ? 'Human review saved.' : result.error ?? 'Could not save review.');
    setSaving(false);
  }

  return (
    <section style={card}>
      <p className="font-mono" style={eyebrow}>HUMAN REVIEW · OPTIONAL OVERRIDES</p>
      <p style={{ margin: '0 0 14px', color: 'var(--text-2)', fontSize: 13, lineHeight: 1.55 }}>An override does not erase the automated score. It records the reviewer’s score and rationale alongside it.</p>
      <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={4000} placeholder="Reviewer notes, observed context, coaching discussion…" style={{ width: '100%', minHeight: 110, resize: 'vertical', padding: 12, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-1)', font: 'inherit' }} />
      <div style={{ display: 'grid', gap: 9, marginTop: 14 }}>
        {rubrics.map((rubric) => {
          const override = overrides.find((item) => item.rubricId === rubric.id);
          return (
            <div key={rubric.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) 80px minmax(220px, 1.4fr)', gap: 10, alignItems: 'center' }}>
              <label htmlFor={`override-${rubric.id}`} style={{ color: 'var(--text-1)', fontSize: 13 }}>{rubric.label} <span style={{ color: 'var(--text-3)' }}>AI {rubric.score}/10</span></label>
              <input id={`override-${rubric.id}`} type="number" min="0" max="10" placeholder="—" value={override?.score ?? ''} onChange={(event) => updateOverride(rubric.id, event.target.value)} style={inputStyle} />
              <input type="text" maxLength={500} placeholder="Rationale required when overriding" value={override?.rationale ?? ''} disabled={!override} onChange={(event) => updateRationale(rubric.id, event.target.value)} style={inputStyle} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}><button className="btn btn-primary" disabled={saving || overrides.some((item) => !item.rationale.trim())} onClick={save}>{saving ? 'Saving…' : 'Save human review'}</button><span style={{ color: status.includes('saved') ? 'var(--primary)' : 'var(--warn)', fontSize: 12 }}>{status}</span></div>
    </section>
  );
}

const card: React.CSSProperties = { padding: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 };
const eyebrow: React.CSSProperties = { margin: '0 0 12px', color: 'var(--text-3)', fontSize: 9, letterSpacing: '0.12em' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-1)' };
