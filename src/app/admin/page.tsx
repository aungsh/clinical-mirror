import Link from 'next/link';
import { AccountHeader } from '@/components/AccountHeader';
import { requirePageUser } from '@/lib/auth.server';
import { listOrganizationSessions, listOrganizationUsers } from '@/lib/database.server';
import { AdminCreateUserForm } from './AdminCreateUserForm';

export const runtime = 'nodejs';

export default async function AdminPage() {
  const admin = await requirePageUser('admin');
  const users = listOrganizationUsers(admin.organizationId);
  const sessions = listOrganizationSessions(admin.organizationId);
  const learners = users.filter((user) => user.role === 'user');
  const trendBySession = buildTrends(sessions);

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <AccountHeader user={admin} />
      <main className="shell" style={{ paddingBlock: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 20, marginBottom: 28 }}>
          <div>
            <p className="font-mono" style={{ margin: '0 0 7px', color: 'var(--accent)', fontSize: 10, letterSpacing: '0.12em' }}>ORGANISATION ADMIN</p>
            <h1 style={{ margin: 0, color: 'var(--text-1)', fontSize: 34 }}>{admin.organizationName}</h1>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><a href="/api/admin/export.csv" className="btn">Export organisation CSV</a><AdminCreateUserForm /></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 34 }}>
          <Metric label="Learners" value={learners.length} />
          <Metric label="Completed sessions" value={sessions.length} />
          <Metric label="Active accounts" value={users.filter((user) => user.active).length} />
        </div>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ margin: '0 0 14px', color: 'var(--text-1)', fontSize: 20 }}>Accounts and participation</h2>
          <div style={{ overflowX: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr>{['Name', 'Email', 'Role', 'Attempts', 'Last activity'].map((heading) => <th key={heading} style={th}>{heading}</th>)}</tr></thead>
              <tbody>{users.map((user) => (
                <tr key={user.id}>
                  <td style={tdStrong}>{user.displayName}</td><td style={td}>{user.email}</td><td style={td}>{user.role}</td><td style={td}>{user.attempts}</td><td style={td}>{user.lastAttemptAt ? formatDate(user.lastAttemptAt) : 'Not started'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 style={{ margin: '0 0 6px', color: 'var(--text-1)', fontSize: 20 }}>Detailed evaluation records</h2>
          <p style={{ margin: '0 0 14px', color: 'var(--text-2)', fontSize: 13 }}>Evidence-level reports are restricted to administrators. Scores are AI-generated indicators for tracking practice, not standalone employment decisions.</p>
          <div style={{ overflowX: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr>{['Learner', 'Scenario', 'Attempt', 'Completed', 'Indicators', ''].map((heading) => <th key={heading} style={th}>{heading}</th>)}</tr></thead>
              <tbody>{sessions.map((session) => {
                const average = Math.round((session.scores.empathy + session.scores.clarity + session.scores.deescalation) / 3);
                const delta = trendBySession.get(session.id) ?? null;
                return (
                  <tr key={session.id}>
                    <td style={tdStrong}>{session.userName}</td><td style={td}>{session.scenarioTitle}</td><td style={td}>{session.attemptNumber}</td><td style={td}>{formatDate(session.endedAt)}</td><td style={td}>{average}/10 average {delta === null ? '· baseline' : `· ${delta >= 0 ? '+' : ''}${delta} vs prior`}</td><td style={td}><Link href={`/admin/sessions/${session.id}`} style={{ color: 'var(--accent)', fontWeight: 600 }}>View report</Link></td>
                  </tr>
                );
              })}</tbody>
            </table>
            {sessions.length === 0 && <p style={{ padding: 24, margin: 0, color: 'var(--text-2)', fontSize: 13 }}>No completed sessions yet.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div style={{ padding: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}><div style={{ color: 'var(--text-1)', fontSize: 30, fontWeight: 700 }}>{value}</div><div style={{ color: 'var(--text-3)', fontSize: 12 }}>{label}</div></div>;
}

function buildTrends(sessions: ReturnType<typeof listOrganizationSessions>) {
  const previousByLearnerScenario = new Map<string, number>();
  const trendBySession = new Map<string, number | null>();
  for (const session of [...sessions].reverse()) {
    const key = `${session.userId}:${session.scenarioTitle}`;
    const average = Math.round((session.scores.empathy + session.scores.clarity + session.scores.deescalation) / 3);
    const previous = previousByLearnerScenario.get(key);
    trendBySession.set(session.id, previous === undefined ? null : average - previous);
    previousByLearnerScenario.set(key, average);
  }
  return trendBySession;
}

function formatDate(value: string) { return new Intl.DateTimeFormat('en-SG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
const th: React.CSSProperties = { padding: '12px 14px', textAlign: 'left', color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.08em', borderBottom: '1px solid var(--border)' };
const td: React.CSSProperties = { padding: '13px 14px', color: 'var(--text-2)', borderBottom: '1px solid var(--border-sub)', whiteSpace: 'nowrap' };
const tdStrong: React.CSSProperties = { ...td, color: 'var(--text-1)', fontWeight: 600 };
