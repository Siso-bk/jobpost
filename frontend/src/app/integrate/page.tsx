import Link from 'next/link';

export default function IntegratePage() {
  return (
    <div className="page-container integrate-page">
      <section className="integrate-hero">
        <div>
          <div className="eyebrow">Developers</div>
          <h1>Integrate PersonalAI authentication in your platform.</h1>
          <p className="muted">
            Use PersonalAI as the source of identity, then link every user to a local profile for
            app access and assistant events.
          </p>
        </div>
        <div className="integrate-actions">
          <Link className="btn-secondary" href="/api/personalai/authorize">
            Test OAuth
          </Link>
          <Link className="btn-primary" href="/register">
            Create account
          </Link>
        </div>
      </section>

      <section className="integrate-section">
        <div className="section-head">
          <h2>Prerequisites</h2>
          <p className="muted">Before you integrate, make sure you have these ready.</p>
        </div>
        <div className="code-card">
          <ul className="integrate-list">
            <li>PersonalAI app credentials (client ID + secret) from the PersonalAI team.</li>
            <li>Approved redirect URI(s), e.g. `https://yourapp.com/api/personalai/callback`.</li>
            <li>A backend that can verify `id_token` and issue your app session cookie.</li>
            <li>PAI service key for assistant event logging (optional but recommended).</li>
          </ul>
        </div>
      </section>

      <section className="integrate-section">
        <div className="section-head">
          <h2>How the integration works</h2>
          <p className="muted">Three steps connect PersonalAI identity to your platform.</p>
        </div>
        <div className="feature-grid">
          <div className="feature-card">
            <h3>1. OAuth sign-in</h3>
            <p>
              Redirect users to PersonalAI, complete the PKCE flow, and receive an `id_token` on
              callback.
            </p>
          </div>
          <div className="feature-card">
            <h3>2. Link the user</h3>
            <p>
              Verify the token server-side and upsert your local user with
              `provider=personalai` and the `providerId` from `sub`.
            </p>
          </div>
          <div className="feature-card">
            <h3>3. Session + assistant</h3>
            <p>
              Issue your own session cookie and log assistant events using the linked
              `providerId`.
            </p>
          </div>
        </div>
      </section>

      <section className="integrate-section">
        <div className="section-head">
          <h2>Supported user flows</h2>
          <p className="muted">Choose what fits your onboarding experience.</p>
        </div>
        <div className="feature-grid">
          <div className="feature-card">
            <h3>OAuth sign-in</h3>
            <p>Best for SSO. Users sign in with PersonalAI and return to your app instantly.</p>
          </div>
          <div className="feature-card">
            <h3>PAI email + code signup</h3>
            <p>
              Use `/api/auth/pai-signup` to send a code, verify it, and collect profile details.
            </p>
          </div>
          <div className="feature-card">
            <h3>PAI password login</h3>
            <p>Let existing PersonalAI users log in with email + password via `/pai-login`.</p>
          </div>
        </div>
      </section>

      <section className="integrate-section">
        <div className="section-head">
          <h2>Required routes</h2>
          <p className="muted">Keep these endpoints stable so your auth flow stays reliable.</p>
        </div>
        <div className="integrate-grid">
          <div className="code-card">
            <div className="code-title">Frontend (Next.js)</div>
            <pre>
              <code>{`GET /api/personalai/authorize
GET /api/personalai/callback`}</code>
            </pre>
          </div>
          <div className="code-card">
            <div className="code-title">Backend (API)</div>
            <pre>
              <code>{`POST /api/auth/external
POST /api/auth/pai-signup
POST /api/auth/pai-signup/verify
POST /api/auth/pai-signup/complete
POST /api/auth/pai-login`}</code>
            </pre>
          </div>
        </div>
      </section>

      <section className="integrate-section">
        <div className="section-head">
          <h2>Environment variables</h2>
          <p className="muted">Set these in your frontend and backend deployments.</p>
        </div>
        <div className="code-card">
          <pre>
            <code>{`# Frontend (Vercel)
API_PROXY_TARGET=https://your-backend.onrender.com/api
PERSONALAI_ISSUER=https://pai-iota.vercel.app
PERSONALAI_AUTHORIZATION_ENDPOINT=/oauth/authorize
PERSONALAI_TOKEN_ENDPOINT=/oauth/token
PERSONALAI_CLIENT_ID=...
PERSONALAI_CLIENT_SECRET=...
PERSONALAI_TENANT_ID=jobpost
PERSONALAI_PLATFORM=jobpost

# Backend (Render)
PERSONALAI_ISSUER=https://pai-iota.vercel.app
PERSONALAI_ID_TOKEN_ALG=HS256
PERSONALAI_CLIENT_SECRET=...
PERSONALAI_AUDIENCE=
PERSONALAI_JWKS_URI=
PAI_API_BASE=https://pai-z9l0.onrender.com
PAI_SERVICE_KEY=...
PAI_TENANT_ID=jobpost
PAI_PLATFORM=jobpost`}</code>
          </pre>
        </div>
      </section>

      <section className="integrate-section">
        <div className="section-head">
          <h2>Node.js quickstart</h2>
          <p className="muted">Minimal Express callback + user linking example.</p>
        </div>
        <div className="code-card">
          <pre>
            <code>{`const axios = require('axios');
const jwt = require('jsonwebtoken');
const { createRemoteJWKSet, jwtVerify } = require('jose');

app.get('/auth/pai/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('missing_code');

  const tokenRes = await axios.post(
    \`\${process.env.PERSONALAI_ISSUER}/oauth/token\`,
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'https://yourapp.com/auth/pai/callback',
      client_id: process.env.PERSONALAI_CLIENT_ID,
      client_secret: process.env.PERSONALAI_CLIENT_SECRET
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const idToken = tokenRes.data.id_token;
  const alg = process.env.PERSONALAI_ID_TOKEN_ALG || 'HS256';
  let payload;

  if (alg === 'RS256') {
    const jwks = createRemoteJWKSet(new URL(process.env.PERSONALAI_JWKS_URI));
    const result = await jwtVerify(idToken, jwks, {
      issuer: process.env.PERSONALAI_ISSUER,
      audience: process.env.PERSONALAI_AUDIENCE
    });
    payload = result.payload;
  } else {
    payload = jwt.verify(idToken, process.env.PERSONALAI_CLIENT_SECRET, {
      issuer: process.env.PERSONALAI_ISSUER,
      audience: process.env.PERSONALAI_AUDIENCE
    });
  }

  const providerId = payload.sub;
  const email = payload.email;
  const name = payload.name || 'User';

  // Upsert local user with provider=personalai, providerId
  const user = await User.findOneAndUpdate(
    { provider: 'personalai', providerId },
    { email, name, provider: 'personalai', providerId },
    { upsert: true, new: true }
  );

  // Issue app session cookie/JWT here
  res.redirect('/dashboard');
});`}</code>
          </pre>
        </div>
      </section>

      <section className="integrate-section">
        <div className="section-head">
          <h2>Production checklist</h2>
          <p className="muted">Use this before you ship.</p>
        </div>
        <div className="code-card">
          <ul className="integrate-list">
            <li>Validate `iss`, `aud`, `exp`, and `sub` on every `id_token`.</li>
            <li>Store only the PersonalAI `providerId` and your local profile fields.</li>
            <li>Use HTTPS and httpOnly cookies for sessions.</li>
            <li>Log assistant events with `x-user-id` set to the PersonalAI `sub`.</li>
          </ul>
        </div>
      </section>

      <section className="integrate-section">
        <div className="section-head">
          <h2>Assistant event logging</h2>
          <p className="muted">Send events with the linked PersonalAI user id.</p>
        </div>
        <div className="code-card">
          <pre>
            <code>{`POST {PAI_API_BASE}/api/events
x-service-key: {PAI_SERVICE_KEY}
x-user-id: {providerId}
x-tenant-id: {PAI_TENANT_ID}
x-platform: {PAI_PLATFORM}`}</code>
          </pre>
        </div>
      </section>
    </div>
  );
}
