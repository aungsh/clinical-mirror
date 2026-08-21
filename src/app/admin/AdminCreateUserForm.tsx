'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminCreateUserForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? 'Account creation failed.');
      setPending(false);
      return;
    }
    form.reset();
    setMessage('Account created. Share the credentials securely with the user.');
    setPending(false);
    router.refresh();
  }

  if (!open) {
    return <button className="btn btn-primary" onClick={() => setOpen(true)}>Create account</button>;
  }

  return (
    <form onSubmit={submit} style={{ padding: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ color: 'var(--text-1)' }}>New organisation account</strong>
        <button type="button" onClick={() => setOpen(false)} style={{ border: 0, background: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>Close</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <Input label="Display name" name="displayName" />
        <Input label="Email" name="email" type="email" />
        <Input label="Temporary password" name="password" type="password" />
        <label style={labelStyle}>Role<select name="role" style={inputStyle}><option value="user">Learner</option><option value="admin">Administrator</option></select></label>
      </div>
      <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 11 }}>Temporary password: at least 10 characters with a letter and number. Password reset is a production follow-up.</p>
      {message && <p role="status" style={{ margin: 0, color: message.startsWith('Account created') ? 'var(--primary)' : 'var(--danger)', fontSize: 12 }}>{message}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary" style={{ justifySelf: 'start' }}>{pending ? 'Creating…' : 'Create account'}</button>
    </form>
  );
}

function Input({ label, name, type = 'text' }: { label: string; name: string; type?: string }) {
  return <label style={labelStyle}>{label}<input name={name} type={type} required style={inputStyle} /></label>;
}

const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--text-2)', fontSize: 12 };
const inputStyle: React.CSSProperties = { padding: '10px 11px', borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', font: 'inherit' };
