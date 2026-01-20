import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function base64url(input: Buffer | string) {
  const buff = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buff.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function absoluteUrl(base: string, path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const u = new URL(base);
  // ensure no double slashes
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${u.origin}${p}`;
}

export async function GET(req: NextRequest) {
  const issuer = process.env.PERSONALAI_ISSUER || 'https://pai-iota.vercel.app';
  const authEndpoint = process.env.PERSONALAI_AUTHORIZATION_ENDPOINT || '/oauth/authorize';
  const clientId = process.env.PERSONALAI_CLIENT_ID || process.env.NEXT_PUBLIC_PERSONALAI_CLIENT_ID;
  const scope = process.env.PERSONALAI_SCOPE || 'openid email profile';

  if (!clientId) {
    return new NextResponse('Missing PERSONALAI_CLIENT_ID', { status: 500 });
  }

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/personalai/callback`;

  // PKCE
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  const state = base64url(crypto.randomBytes(16));

  const url = new URL(absoluteUrl(issuer, authEndpoint));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scope);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('code_challenge', challenge);

  const res = NextResponse.redirect(url.toString());
  const isProd = process.env.NODE_ENV === 'production';
  res.cookies.set('personalai_state', state, { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/' });
  res.cookies.set('personalai_verifier', verifier, { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/' });
  return res;
}

