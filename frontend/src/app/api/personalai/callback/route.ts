import { NextRequest, NextResponse } from 'next/server';

function absoluteUrl(base: string, path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const u = new URL(base);
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${u.origin}${p}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = req.cookies.get('personalai_state')?.value;
  const verifier = req.cookies.get('personalai_verifier')?.value;

  const origin = url.origin;
  const isProd = process.env.NODE_ENV === 'production';

  if (!code) return NextResponse.redirect(`${origin}/login?error=missing_code`);
  if (!state || !cookieState || state !== cookieState)
    return NextResponse.redirect(`${origin}/login?error=state_mismatch`);
  if (!verifier) return NextResponse.redirect(`${origin}/login?error=missing_verifier`);

  try {
    const issuer = process.env.PERSONALAI_ISSUER || 'https://pai-iota.vercel.app';
    const tokenEndpoint = process.env.PERSONALAI_TOKEN_ENDPOINT || '/oauth/token';
    const clientId = process.env.PERSONALAI_CLIENT_ID || process.env.NEXT_PUBLIC_PERSONALAI_CLIENT_ID;
    const clientSecret = process.env.PERSONALAI_CLIENT_SECRET;

    if (!clientId) throw new Error('Missing PERSONALAI_CLIENT_ID');

    const redirectUri = `${origin}/api/personalai/callback`;

    const body = new URLSearchParams();
    body.set('grant_type', 'authorization_code');
    body.set('code', code);
    body.set('redirect_uri', redirectUri);
    body.set('client_id', clientId);
    if (clientSecret) body.set('client_secret', clientSecret);
    body.set('code_verifier', verifier);

    const tokenRes = await fetch(absoluteUrl(issuer, tokenEndpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      cache: 'no-store',
    });
    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      throw new Error(`token_exchange_failed: ${tokenRes.status} ${txt}`);
    }
    const tokens = await tokenRes.json();
    const id_token = tokens.id_token as string | undefined;
    if (!id_token) throw new Error('missing_id_token');

    // Call backend directly (server-to-server) and then set cookie on this response
    const backendBase = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const appRes = await fetch(`${backendBase.replace(/\/$/, '')}/auth/external`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token }),
      cache: 'no-store',
    });
    if (!appRes.ok) {
      const txt = await appRes.text();
      throw new Error(`app_login_failed: ${appRes.status} ${txt}`);
    }
    const appData = await appRes.json();
    const token = appData?.token as string | undefined;
    const user = appData?.user || {};
    if (!token) throw new Error('missing_app_token');

    const next = NextResponse.redirect(`${origin}/auth/catch?id=${encodeURIComponent(user.id || '')}&role=${encodeURIComponent(user.role || '')}`);
    const isProd = process.env.NODE_ENV === 'production';
    next.cookies.set('token', token, { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge: 7 * 24 * 60 * 60 });
    // Clear PKCE cookies
    next.cookies.set('personalai_state', '', { path: '/', expires: new Date(0), httpOnly: true, sameSite: 'lax', secure: isProd });
    next.cookies.set('personalai_verifier', '', { path: '/', expires: new Date(0), httpOnly: true, sameSite: 'lax', secure: isProd });
    return next;
  } catch (e: any) {
    const msg = e?.message || 'callback_error';
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);
  }
}
