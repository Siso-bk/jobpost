'use client';
import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/services/api';
import { friendlyError } from '@/lib/feedback';
import { getDefaultRouteForRoles, normalizeRoles } from '@/lib/roles';

function LoginPageClient() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<'pai' | 'local'>('pai');
  const [needsRole, setNeedsRole] = useState(false);
  const [role, setRole] = useState('worker');
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
    const raw = searchParams.get('error');
    if (!raw) return;
    let message = '';
    if (raw === 'oidc_not_configured' || raw === 'missing_client_id') {
      message = 'PersonalAI sign-in is not configured. Please use email/password instead.';
    } else if (raw === 'missing_code') {
      message = 'PersonalAI sign-in failed. Please try again.';
    } else if (raw === 'state_mismatch' || raw === 'missing_verifier') {
      message = 'PersonalAI sign-in was interrupted. Please try again.';
    } else if (raw.startsWith('token_exchange_failed')) {
      message = 'PersonalAI sign-in failed. Please try again.';
    } else if (raw.startsWith('app_login_failed')) {
      message = 'We could not complete sign-in. Please try again.';
    } else if (raw === 'missing_id_token' || raw === 'missing_app_token') {
      message = 'PersonalAI sign-in failed. Please try again.';
    }
    if (message) setError(message);
    if (message) setStatus('');
  }, [searchParams]);

  useEffect(() => {
    const emailParam = searchParams.get('email');
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
      const res =
        authMode === 'local'
          ? await authService.localLogin(formData.email, formData.password)
          : await authService.paiLogin(formData.email, formData.password, needsRole ? role : undefined);
      setStatus('Signed in. Redirecting...');
      const roles = normalizeRoles(res.data?.user?.roles);
      router.push(getDefaultRouteForRoles(roles));
    } catch (err: any) {
      setStatus('');
      const code = err?.response?.data?.code;
      if (code === 'email_not_verified') {
        setError('Email not verified. Please register to request a new code.');
      } else if (code === 'jobpost_profile_required') {
        setNeedsRole(true);
        setError('Choose your role to finish creating your JobPost profile.');
      } else if (code === 'use_pai_login') {
        setError('This email is managed by PersonalAI. Switch to PersonalAI login.');
      } else {
        setError(friendlyError(err, 'We could not log you in. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Login</h2>
        <div className="auth-alt">
          <button
            type="button"
            className={authMode === 'pai' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => {
              setAuthMode('pai');
              setNeedsRole(false);
              setError('');
              setStatus('');
            }}
          >
            PersonalAI
          </button>
          <button
            type="button"
            className={authMode === 'local' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => {
              setAuthMode('local');
              setNeedsRole(false);
              setError('');
              setStatus('');
            }}
          >
            Local account
          </button>
        </div>
        {status && <p className="status-message">{status}</p>}
        {error && <p className="error-message">{error}</p>}
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
          {authMode === 'pai' && needsRole && (
            <label>
              <span>Role</span>
              <select name="role" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="worker">Worker</option>
                <option value="employer">Employer</option>
              </select>
            </label>
          )}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        {authMode === 'pai' && (
          <div className="auth-alt">
            <a className="btn-secondary" href="/api/personalai/authorize">
              Sign in with PersonalAI
            </a>
          </div>
        )}
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
