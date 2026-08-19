import { NextResponse } from 'next/server';
import { destroyLoginSession } from '@/lib/auth.server';

export async function POST(req: Request) {
  await destroyLoginSession();
  return NextResponse.redirect(new URL('/login', req.url), 303);
}
