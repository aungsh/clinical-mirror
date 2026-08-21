import Link from 'next/link';
import type { StoredUser } from '@/lib/database.server';

export function AccountHeader({ user }: { user: StoredUser }) {
  return (
    <header style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div className="shell" style={{ minHeight: 64, display: 'flex', alignItems: 'center', gap: 18 }}>
        <Link href="/" style={{ color: 'var(--text-1)', fontWeight: 700, textDecoration: 'none' }}>
          ClinicalMirror
        </Link>
        <span style={{ color: 'var(--border)' }}>·</span>
        <span style={{ color: 'var(--text-2)', fontSize: 13 }}>{user.organizationName}</span>
        <nav style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/dashboard" style={{ color: 'var(--text-2)', fontSize: 13, textDecoration: 'none' }}>
            My practice
          </Link>
          {user.role === 'admin' && (
            <Link href="/admin" style={{ color: 'var(--text-2)', fontSize: 13, textDecoration: 'none' }}>
              Admin
            </Link>
          )}
          <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{user.displayName}</span>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="btn btn-sm" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              Sign out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
