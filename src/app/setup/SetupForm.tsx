'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SetupForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const res = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? 'Setup failed.');
      setPending(false);
      return;
    }
    router.push('/admin');
    router.refresh();
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Field name="organizationName" label="Organisation name" autoComplete="organization" />
      <Field name="adminName" label="Administrator name" autoComplete="name" />
      <Field name="email" label="Administrator email" type="email" autoComplete="email" />
      <Field name="password" label="Password" type="password" autoComplete="new-password" />
      <p style={{ margin: '-4px 0 0', color: 'var(--text-3)', fontSize: 11 }}>At least 10 characters, including a letter and a number.</p>
      {error && <p role="alert" style={{ margin: 0, color: 'var(--danger)', fontSize: 13 }}>{error}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary" style={{ justifyContent: 'center', marginTop: 4 }}>
        {pending ? 'Creating…' : 'Create organisation and admin'}
      </button>
    </form>
  );
}

function Field({ name, label, type = 'text', autoComplete }: { name: string; label: string; type?: string; autoComplete?: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--text-2)', fontSize: 13 }}>
      {label}
      <input name={name} type={type} required autoComplete={autoComplete} style={{ padding: '11px 12px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-1)', font: 'inherit' }} />
    </label>
  );
}
