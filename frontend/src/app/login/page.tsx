'use client';
import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/services/api';
import { friendlyError } from '@/lib/feedback';
import { getDefaultRouteForRoles, normalizeRoles } from '@/lib/roles';

const OIDC_ERRORS: Record<string, string> = {
  oidc_not_configured: 'PersonalAI login is not configured yet.',
  missing_code: 'Login was interrupted. Please try again.',
  missing_state: 'Login validation failed. Please try again.',
  state_mismatch: 'Login validation failed. Please try again.',
  missing_verifier: 'Login validation failed. Please try again.',
  token_exchange_failed: 'We could not complete PersonalAI login. Please try again.',
  missing_id_token: 'We could not complete PersonalAI login. Please try again.',
  external_auth_failed: 'We could not complete PersonalAI login. Please try again.',
  unauthorized_client: 'PersonalAI login is not enabled for this app yet.',
  invalid_redirect_uri: 'PersonalAI login redirect URL is not allowed yet.',
  invalid_scope: 'PersonalAI login scope is not allowed.',
  access_denied: 'PersonalAI login was cancelled.',
  login_required: 'Please sign in to PersonalAI to continue.',
  invalid_request: 'PersonalAI login could not be completed. Please try again.',
  server_error: 'PersonalAI login failed on the server. Please try again.',
};

function LoginPageClient() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [role, setRole] = useState('worker');
  const [needsRole, setNeedsRole] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let active = true;
    authService
      .me()
      .then((res) => {
        if (!active) return;
        const roles = normalizeRoles(res.data?.roles);
        if (roles.length) {
          router.replace(getDefaultRouteForRoles(roles));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    const raw = searchParams?.get('error');
    if (!raw) return;
    setError(OIDC_ERRORS[raw] || 'We could not complete sign-in. Please try again.');
    setStatus('');
  }, [searchParams]);

  useEffect(() => {
    const emailParam = searchParams?.get('email');
    if (emailParam && !formData.email) {
      setFormData((prev) => ({ ...prev, email: emailParam }));
    }
  }, [searchParams, formData.email]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setStatus('Signing you in...');
    try {
      const res = await authService.paiLogin(
        formData.email.trim().toLowerCase(),
        formData.password,
        needsRole ? role : undefined
      );
      setStatus('Signed in. Redirecting...');
      const roles = normalizeRoles(res.data?.user?.roles);
      router.push(getDefaultRouteForRoles(roles));
    } catch (err: any) {
      setStatus('');
      const code = err?.response?.data?.code;
      if (code === 'jobpost_profile_required') {
        setNeedsRole(true);
        setStatus('Choose a role to finish your JobPost profile.');
        return;
      }
      if (code === 'email_not_verified') {
        setError('Please verify your PersonalAI email before signing in.');
        return;
      }
      setError(friendlyError(err, 'We could not log you in. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Sign in</h2>
        {status && <p className="status-message">{status}</p>}
        {error && <p className="error-message">{error}</p>}
        <p className="status-message">Sign in with your PersonalAI email</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            <span>Email</span>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            <span>Password</span>
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="********"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      d="M3 4l18 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 12s3.5-6 10-6c2.2 0 4.1.5 5.6 1.4M22 12s-3.5 6-10 6c-2.7 0-5-.9-6.8-2.2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                      d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                )}
              </button>
            </div>
          </label>
          {needsRole && (
            <label>
              <span>Role</span>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="worker">Worker</option>
                <option value="employer">Employer</option>
              </select>
            </label>
          )}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="auth-meta">
          Do not have an account? <a href="/register">Register here</a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageClient />
    </Suspense>
  );
}
