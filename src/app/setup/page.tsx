import { redirect } from 'next/navigation';
import { userCount } from '@/lib/database.server';
import { SetupForm } from './SetupForm';

export const runtime = 'nodejs';

export default function SetupPage() {
  if (userCount() > 0) redirect('/login');
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg)' }}>
      <section style={{ width: 'min(100%, 460px)', padding: 32, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: 'var(--sh-2)' }}>
        <p className="font-mono" style={{ margin: 0, color: 'var(--accent)', fontSize: 10, letterSpacing: '0.12em' }}>FIRST-TIME SETUP</p>
        <h1 style={{ margin: '12px 0 8px', color: 'var(--text-1)', fontSize: 30 }}>Create your workspace</h1>
        <p style={{ margin: '0 0 24px', color: 'var(--text-2)', fontSize: 14, lineHeight: 1.55 }}>
          This creates the organisation database and the first administrator account. Passwords are hashed; the original password is never stored.
        </p>
        <SetupForm />
      </section>
    </main>
  );
}
