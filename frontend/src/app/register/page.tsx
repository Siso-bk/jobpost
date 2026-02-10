'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/api';
import { friendlyError } from '@/lib/feedback';
import { getDefaultRouteForRoles, normalizeRoles } from '@/lib/roles';

type StatusTone = 'info' | 'success' | 'fail';

export default function RegisterPage() {
  const [step, setStep] = useState<'email' | 'verify' | 'details'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [preToken, setPreToken] = useState('');
  const [details, setDetails] = useState({
    name: '',
    password: '',
    handle: '',
    role: 'worker',
  });
  const [existingAccount, setExistingAccount] = useState(false);
  const [status, setStatus] = useState<{ tone: StatusTone; message: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

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

  const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    setDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setStatus({ tone: 'info', message: 'Sending verification code...' });
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const res = await authService.paiSignup(normalizedEmail);
      const exists = Boolean(res.data?.exists);
      const profileComplete = Boolean(res.data?.profileCompleted);
      if (exists && profileComplete) {
        setError('Account already exists. Please log in.');
        setStatus(null);
        return;
      }
      if (exists) {
        setExistingAccount(true);
        setStatus({
          tone: 'success',
          message: 'We sent a verification code. Enter it to continue setting up JobPost.',
        });
        setStep('verify');
        try {
          await authService.paiResend(normalizedEmail);
        } catch {
          // ignore resend failures, user can retry
        }
        return;
      }
      setExistingAccount(false);
      setStatus({ tone: 'success', message: res.data?.message || 'Verification code sent.' });
      setStep('verify');
    } catch (err: any) {
      setStatus(null);
      setError(friendlyError(err, 'We could not send the verification code.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setStatus({ tone: 'info', message: 'Verifying code...' });
    const normalizedEmail = email.trim().toLowerCase();
    try {
      if (existingAccount) {
        const res = await authService.paiVerifyCode(normalizedEmail, code.trim(), details.role);
        const roles = normalizeRoles(res.data?.user?.roles);
        setStatus({ tone: 'success', message: 'Email verified. Redirecting...' });
        router.push(getDefaultRouteForRoles(roles));
        return;
      }
      const res = await authService.paiSignupVerify(normalizedEmail, code.trim());
      const token = res.data?.preToken;
      if (!token) {
        throw new Error('Verification failed.');
      }
      setPreToken(token);
      setStatus({ tone: 'success', message: 'Code verified. Finish creating your profile.' });
      setStep('details');
    } catch (err: any) {
      setStatus(null);
      const codeValue = err?.response?.data?.code;
      if (codeValue === 'jobpost_profile_required') {
        setError('Choose a role to finish your JobPost profile.');
      } else {
        setError(friendlyError(err, 'We could not verify that code.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setStatus({ tone: 'info', message: 'Creating your account...' });
    try {
      const res = await authService.paiSignupComplete({
        preToken,
        name: details.name.trim(),
        password: details.password,
        handle: details.handle.trim(),
        role: details.role,
      });
      setStatus({ tone: 'success', message: 'Account created. Redirecting...' });
      const roles = normalizeRoles(res.data?.user?.roles);
      router.push(getDefaultRouteForRoles(roles));
    } catch (err: any) {
      setStatus(null);
      setError(friendlyError(err, 'We could not create your account. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError('');
    setStatus({ tone: 'info', message: 'Sending a new code...' });
    const normalizedEmail = email.trim().toLowerCase();
    try {
      if (existingAccount) {
        await authService.paiResend(normalizedEmail);
      } else {
        await authService.paiSignup(normalizedEmail);
      }
      setStatus({ tone: 'success', message: 'Verification code sent.' });
    } catch (err: any) {
      setStatus(null);
      setError(friendlyError(err, 'We could not resend the code.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Create Account</h2>
        {status && <p className={`status-message status-${status.tone}`}>{status.message}</p>}
        {error && <p className="error-message">{error}</p>}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="auth-form">
            <label>
              <span>Email</span>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send verification code'}
            </button>
          </form>
        )}
        {step === 'verify' && (
          <form onSubmit={handleVerifySubmit} className="auth-form">
            <label>
              <span>Verification code</span>
              <input
                type="text"
                name="code"
                inputMode="numeric"
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </label>
            {existingAccount && (
              <label>
                <span>Role</span>
                <select name="role" value={details.role} onChange={handleDetailsChange}>
                  <option value="worker">Worker</option>
                  <option value="employer">Employer</option>
                </select>
              </label>
            )}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify code'}
            </button>
            <div className="auth-alt">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleResend}
                disabled={loading}
              >
                Resend code
              </button>
            </div>
          </form>
        )}
        {step === 'details' && (
          <form onSubmit={handleDetailsSubmit} className="auth-form">
            <label>
              <span>Full Name</span>
              <input
                type="text"
                name="name"
                placeholder="Jane Doe"
                value={details.name}
                onChange={handleDetailsChange}
                required
              />
            </label>
            <label>
              <span>Username</span>
              <input
                type="text"
                name="handle"
                placeholder="yourname"
                value={details.handle}
                onChange={handleDetailsChange}
                required
              />
            </label>
            <label>
              <span>Password</span>
              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="At least 8 chars, upper/lower, number"
                  value={details.password}
                  onChange={handleDetailsChange}
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
            <label>
              <span>Role</span>
              <select name="role" value={details.role} onChange={handleDetailsChange}>
                <option value="worker">Worker</option>
                <option value="employer">Employer</option>
              </select>
            </label>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create account'}
            </button>
          </form>
        )}

        <p className="auth-meta">
          Already have an account? <a href="/login">Login here</a>
        </p>
      </div>
    </div>
  );
}
