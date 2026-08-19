import Link from 'next/link';
import { AccountHeader } from '@/components/AccountHeader';
import { requirePageUser } from '@/lib/auth.server';
import { getUserUsage, listUserSessions } from '@/lib/database.server';

export const runtime = 'nodejs';

export default async function DashboardPage() {
  const user = await requirePageUser();
  const sessions = listUserSessions(user.id);
  const usage = getUserUsage(user);

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <AccountHeader user={user} />
      <main className="shell" style={{ paddingBlock: 42 }}>
        <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 20, marginBottom: 30 }}>
          <div>
            <p className="font-mono" style={{ margin: '0 0 7px', color: 'var(--accent)', fontSize: 10, letterSpacing: '0.12em' }}>MY PRACTICE</p>
            <h1 style={{ margin: 0, color: 'var(--text-1)', fontSize: 34 }}>Welcome, {user.displayName}</h1>
          </div>
          <Link href="/#scenarios" className="btn btn-primary">Start a practice session</Link>
        </div>

        <section style={{ padding: 22, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, marginBottom: 28 }}>
          <p style={{ margin: '0 0 5px', color: 'var(--text-1)', fontWeight: 600 }}>
            {user.role === 'admin' ? `${sessions.length} completed test session${sessions.length === 1 ? '' : 's'}` : `${usage.used} of ${usage.limit} attempts used in the last ${usage.windowDays} days`}
          </p>
          <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13, lineHeight: 1.55 }}>
            Your learner view stays concise and coaching-focused. Detailed evidence is available only to authorised organisation administrators.
          </p>
        </section>

        <h2 style={{ margin: '0 0 14px', color: 'var(--text-1)', fontSize: 20 }}>Practice history</h2>
        {sessions.length === 0 ? (
          <div style={{ padding: 30, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, color: 'var(--text-2)', fontSize: 14 }}>
            No completed sessions yet. Choose a scenario to begin.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sessions.map((session) => (
              <Link href={`/dashboard/sessions/${session.id}`} key={session.id} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '16px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, textDecoration: 'none' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 4px', color: 'var(--text-1)', fontWeight: 600 }}>{session.scenarioTitle}</p>
                  <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 12 }}>Attempt {session.attemptNumber} · {formatDate(session.endedAt)}</p>
                </div>
                <span style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 600 }}>Completed</span>
                <span style={{ color: 'var(--accent)', fontSize: 12 }}>View report →</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-SG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
