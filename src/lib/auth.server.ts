import 'server-only';

import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  deleteAuthSession,
  findUserBySessionTokenHash,
  insertAuthSession,
  type StoredUser,
} from '@/lib/database.server';
import type { UserRole } from '@/lib/types';

export const SESSION_COOKIE_NAME = 'cm_session';
const SESSION_DAYS = 7;

function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export function verifyPassword(password: string, encoded: string): boolean {
  const [algorithm, saltText, hashText] = encoded.split('$');
  if (algorithm !== 'scrypt' || !saltText || !hashText) return false;
  try {
    const salt = Buffer.from(saltText, 'base64url');
    const expected = Buffer.from(hashText, 'base64url');
    const actual = scryptSync(password, salt, expected.length);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function validatePassword(password: string): string | null {
  if (password.length < 10) return 'Password must be at least 10 characters.';
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include at least one letter and one number.';
  }
  return null;
}

export async function createLoginSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  insertAuthSession({
    userId,
    tokenHash: hashSessionToken(token),
    expiresAt: expiresAt.toISOString(),
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.AUTH_COOKIE_SECURE !== 'false',
    path: '/',
    expires: expiresAt,
  });
}

export async function destroyLoginSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) deleteAuthSession(hashSessionToken(token));
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<StoredUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return findUserBySessionTokenHash(hashSessionToken(token));
}

export async function requirePageUser(requiredRole?: UserRole): Promise<StoredUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (requiredRole && user.role !== requiredRole) redirect('/dashboard');
  return user;
}
