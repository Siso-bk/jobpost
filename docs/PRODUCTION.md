# Production Readiness Checklist

This checklist covers the minimum steps to run JobPost safely in production.

## Environment

- MONGODB_URI is set to a production database
- JWT_SECRET is a long random value
- NODE_ENV=production
- CORS_ORIGIN is set to the frontend domain(s), comma-separated
- FRONTEND_URL is set to the primary frontend domain
- COOKIE_SAMESITE=none (required for cross-site cookies)
- COOKIE_SECURE=true (required for SameSite=None on HTTPS)

## PersonalAI (optional)

- PERSONALAI_CLIENT_ID and endpoints are set if using OIDC login
- PAI_API_BASE is set if using PersonalAI gateway calls
- PAI_TENANT_ID and PAI_PLATFORM are set to match your tenant

## Infrastructure

- HTTPS is enabled for both frontend and backend
- Database backups are configured
- Logs are forwarded from Render/Vercel to your log store
- Health checks are configured:
  - /api/health
  - /api/db-health

## Security

- Review ADMIN_EMAILS/ADMIN_USER_IDS for moderation access
- Ensure CORS_ORIGIN only includes trusted domains
- Verify cookies are set with SameSite=None; Secure when using Vercel + Render

## Smoke Tests

- Register with PersonalAI, create profile, then login
- Register/login with local fallback
- Confirm /api/auth/me returns the user when logged in
- Confirm login persists across refresh

