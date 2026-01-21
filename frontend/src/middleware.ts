import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Protect selected routes on the server side
const PROTECTED_PREFIXES = ['/post-job', '/profile', '/my-applications'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!needsAuth) return NextResponse.next();

  const token = req.cookies.get('token')?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/post-job/:path*', '/profile/:path*', '/my-applications/:path*'],
};
