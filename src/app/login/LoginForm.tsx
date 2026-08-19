'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? 'Sign in failed.');
      setPending(false);
      return;
    }
    router.push(data.role === 'admin' ? '/admin' : '/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--text-2)', fontSize: 13 }}>
        Email
        <input name="email" type="email" required autoComplete="email" style={inputStyle} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--text-2)', fontSize: 13 }}>
        Password
        <input name="password" type="password" required autoComplete="current-password" style={inputStyle} />
      </label>
      {error && <p role="alert" style={{ margin: 0, color: 'var(--danger)', fontSize: 13 }}>{error}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary" style={{ justifyContent: 'center' }}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '11px 12px',
  borderRadius: 'var(--r)',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text-1)',
  font: 'inherit',
};
