function resolveSameSite() {
  const configured = (process.env.COOKIE_SAMESITE || '').trim().toLowerCase();
  if (configured === 'lax' || configured === 'strict' || configured === 'none') {
    return configured;
  }
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && process.env.CORS_ORIGIN) {
    return 'none';
  }
  return 'lax';
}

function resolveSecure(sameSite) {
  if (sameSite === 'none') {
    return true;
  }
  if (process.env.COOKIE_SECURE) {
    return process.env.COOKIE_SECURE === 'true';
  }
  return process.env.NODE_ENV === 'production';
}

function authCookieOptions() {
  const sameSite = resolveSameSite();
  const secure = resolveSecure(sameSite);
  return {
    httpOnly: true,
    sameSite,
    secure,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
  };
}

function clearAuthCookieOptions() {
  const sameSite = resolveSameSite();
  const secure = resolveSecure(sameSite);
  return {
    httpOnly: true,
    sameSite,
    secure,
    path: '/'
  };
}

function csrfCookieOptions() {
  const sameSite = resolveSameSite();
  const secure = resolveSecure(sameSite);
  return {
    httpOnly: false,
    sameSite,
    secure,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
  };
}

module.exports = {
  authCookieOptions,
  clearAuthCookieOptions,
  csrfCookieOptions
};
