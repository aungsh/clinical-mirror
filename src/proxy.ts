import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = 'cm_session';

export function proxy(req: NextRequest) {
  if (!req.cookies.get(SESSION_COOKIE_NAME)?.value) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/session/:path*', '/feedback', '/dashboard/:path*', '/admin/:path*'],
};
