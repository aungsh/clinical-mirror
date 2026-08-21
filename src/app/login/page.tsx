import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth.server';
import { userCount } from '@/lib/database.server';
import { LoginForm } from './LoginForm';

export const runtime = 'nodejs';

export default async function LoginPage() {
  const current = await getCurrentUser();
  if (current) redirect(current.role === 'admin' ? '/admin' : '/dashboard');
  const setupRequired = userCount() === 0;

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg)' }}>
      <section style={{ width: 'min(100%, 420px)', padding: 32, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: 'var(--sh-2)' }}>
        <Link href="/" style={{ color: 'var(--text-1)', fontWeight: 700, textDecoration: 'none' }}>ClinicalMirror</Link>
        <h1 style={{ margin: '28px 0 8px', color: 'var(--text-1)', fontSize: 30 }}>Sign in</h1>
        <p style={{ margin: '0 0 24px', color: 'var(--text-2)', fontSize: 14, lineHeight: 1.55 }}>
          Use the account provided by your organisation.
        </p>
        {setupRequired ? (
          <div style={{ padding: 16, background: 'var(--accent-bg)', border: '1px solid var(--accent-bd)', borderRadius: 'var(--r)' }}>
            <p style={{ margin: '0 0 12px', color: 'var(--text-2)', fontSize: 13 }}>No accounts exist yet. Create the first administrator.</p>
            <Link href="/setup" className="btn btn-primary" style={{ justifyContent: 'center' }}>Begin setup</Link>
          </div>
        ) : <LoginForm />}
      </section>
    </main>
  );
}
