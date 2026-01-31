function add(list, message) {
  list.push(message);
}

function isTruthy(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function validateEnv() {
  const errors = [];
  const warnings = [];
  const isProd = process.env.NODE_ENV === 'production';

  if (!isTruthy(process.env.MONGODB_URI)) {
    add(errors, 'MONGODB_URI is required');
  }
  if (!isTruthy(process.env.JWT_SECRET)) {
    add(errors, 'JWT_SECRET is required');
  }

  if (isProd) {
    if (!isTruthy(process.env.CORS_ORIGIN)) {
      add(errors, 'CORS_ORIGIN is required in production for cross-site cookies');
    }
    if (!isTruthy(process.env.FRONTEND_URL)) {
      add(errors, 'FRONTEND_URL is required in production');
    }
  }

  const sameSite = (process.env.COOKIE_SAMESITE || '').trim().toLowerCase();
  if (sameSite === 'none' && process.env.COOKIE_SECURE !== 'true') {
    add(
      warnings,
      'COOKIE_SAMESITE=none requires COOKIE_SECURE=true to work over HTTPS in modern browsers'
    );
  }

  if (isTruthy(process.env.PERSONALAI_CLIENT_ID)) {
    if (!isTruthy(process.env.PERSONALAI_AUTHORIZATION_ENDPOINT)) {
      add(warnings, 'PERSONALAI_AUTHORIZATION_ENDPOINT is recommended when PERSONALAI_CLIENT_ID is set');
    }
    if (!isTruthy(process.env.PERSONALAI_TOKEN_ENDPOINT)) {
      add(warnings, 'PERSONALAI_TOKEN_ENDPOINT is recommended when PERSONALAI_CLIENT_ID is set');
    }
  }

  return { errors, warnings };
}

module.exports = { validateEnv };
