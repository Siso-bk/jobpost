import { NextRequest, NextResponse } from 'next/server';

function absoluteUrl(base: string, path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const u = new URL(base);
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${u.origin}${p}`;
}

function redirectWithError(origin: string, code: string) {
  const url = new URL(`${origin}/login`);
  url.searchParams.set('error', code);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const oauthError = url.searchParams.get('error');
  const state = url.searchParams.get('state');
  const expectedState = req.cookies.get('personalai_state')?.value;
  const verifier = req.cookies.get('personalai_verifier')?.value;

  if (oauthError) return redirectWithError(origin, oauthError);
  if (!code) return redirectWithError(origin, 'missing_code');
  if (!state || !expectedState) return redirectWithError(origin, 'missing_state');
  if (state !== expectedState) return redirectWithError(origin, 'state_mismatch');
  if (!verifier) return redirectWithError(origin, 'missing_verifier');

  const issuer =
    process.env.PERSONALAI_ISSUER || process.env.PAI_API_BASE || 'https://pai-iota.vercel.app';
  const tokenEndpoint = process.env.PERSONALAI_TOKEN_ENDPOINT || '/oauth/token';
  const clientId = process.env.PERSONALAI_CLIENT_ID || process.env.NEXT_PUBLIC_PERSONALAI_CLIENT_ID;
  const clientSecret = process.env.PERSONALAI_CLIENT_SECRET;
  if (!clientId) return redirectWithError(origin, 'oidc_not_configured');

  const tokenUrl = absoluteUrl(issuer, tokenEndpoint);
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${origin}/api/personalai/callback`,
    client_id: clientId,
    code_verifier: verifier,
  });
  if (clientSecret) body.set('client_secret', clientSecret);

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!tokenRes.ok) return redirectWithError(origin, 'token_exchange_failed');

  const tokenData = await tokenRes.json().catch(() => ({}));
  const idToken = tokenData?.id_token;
  if (!idToken) return redirectWithError(origin, 'missing_id_token');

  const rawBase =
    process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const trimmed = rawBase.replace(/\/$/, '');
  const apiBase = trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;

  const backendRes = await fetch(`${apiBase}/auth/external`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  });

  if (!backendRes.ok) return redirectWithError(origin, 'external_auth_failed');

  const response = NextResponse.redirect(`${origin}/auth/catch`);
  const backendCookie = backendRes.headers.get('set-cookie');
  if (backendCookie) {
    response.headers.append('set-cookie', backendCookie);
  }

  const isProd = process.env.NODE_ENV === 'production';
  response.cookies.set('personalai_state', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: 0,
  });
  response.cookies.set('personalai_verifier', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: 0,
  });

  return response;
}
