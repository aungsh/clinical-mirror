'use client';

import { useState } from 'react';

export function ReportActions({ sessionId, learnerName, scenarioTitle }: { sessionId: string; learnerName: string; scenarioTitle: string }) {
  const [copied, setCopied] = useState(false);
  function secureLink() { return `${window.location.origin}/admin/sessions/${sessionId}`; }
  async function logShare(channel: string) { await fetch(`/api/admin/sessions/${sessionId}/share`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel }) }).catch(() => undefined); }
  async function copy() { await navigator.clipboard.writeText(secureLink()); await logShare('copied-secure-link'); setCopied(true); }
  async function email() {
    await logShare('email-draft');
    const subject = encodeURIComponent(`ClinicalMirror report: ${learnerName} - ${scenarioTitle}`);
    const body = encodeURIComponent(`An authorised ClinicalMirror administrator shared this secure report link:\n\n${secureLink()}\n\nSign-in is required. Do not forward this link to unauthorised recipients.`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }
  return <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}><a className="btn" href={`/api/reports/${sessionId}/pdf?view=admin`}>Admin PDF</a><a className="btn" href={`/api/reports/${sessionId}/pdf?view=learner`}>Learner PDF</a><button className="btn" onClick={copy}>{copied ? 'Link copied' : 'Copy secure link'}</button><button className="btn" onClick={email}>Email secure link</button></div>;
}
