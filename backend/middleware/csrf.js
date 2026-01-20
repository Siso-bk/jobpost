const crypto = require('crypto');

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

// Lightweight CSRF protection using double-submit cookie
// - On GET/HEAD/OPTIONS: ensure a csrfToken cookie exists (create if missing)
// - On state-changing methods: require x-csrf-token header to match cookie
module.exports = function csrf() {
  return (req, res, next) => {
    const method = (req.method || 'GET').toUpperCase();
    const isUnsafe = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    const isProd = process.env.NODE_ENV === 'production';
    const path = req.path || '';

    // Skip CSRF for auth endpoints (login/register/logout/external)
    if (path.startsWith('/api/auth')) {
      return next();
    }

    const cookieName = 'csrfToken';
    const cookieToken = req.cookies ? req.cookies[cookieName] : undefined;

    if (!isUnsafe) {
      if (!cookieToken) {
        const token = generateToken();
        res.cookie(cookieName, token, {
          httpOnly: false, // must be readable by browser to echo in header
          sameSite: 'lax',
          secure: isProd,
          path: '/',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }
      return next();
    }

    // For mutating requests, validate header
    const headerToken = (req.headers['x-csrf-token'] || '').toString();
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return res.status(403).json({ error: 'forbidden', message: 'Invalid CSRF token' });
    }
    return next();
  };
};
