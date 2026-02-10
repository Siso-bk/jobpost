'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/api';
import { friendlyError } from '@/lib/feedback';

type StatusTone = 'info' | 'success' | 'fail';
const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;
const PASSWORD_HINT = 'Use at least 8 characters with uppercase, lowercase, and a number.';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<{ tone: StatusTone; message: string } | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    let active = true;
    authService
      .me()
      .then((res) => {
        if (!active) return;
        const userEmail = res.data?.email || '';
        if (!userEmail) {
          router.replace('/login');
          return;
        }
        setEmail(userEmail);
      })
      .catch(() => {
        if (!active) return;
        router.replace('/login');
      });
    return () => {
      active = false;
    };
  }, [router]);

  const handleSendCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) return;
    setError('');
    setStatus({ tone: 'info', message: 'Sending verification code...' });
    setSending(true);
    try {
      await authService.forgotPassword(email.trim().toLowerCase());
      setStatus({ tone: 'success', message: 'Verification code sent to your email.' });
      setCodeSent(true);
    } catch (err: any) {
      setStatus(null);
      setError(friendlyError(err, 'We could not send the verification code.'));
    } finally {
      setSending(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!STRONG_PASSWORD.test(password)) {
      setError(PASSWORD_HINT);
      setStatus(null);
      return;
    }
    if (password !== confirm) {
      setError('Passwords must match.');
      setStatus(null);
      return;
    }
    setError('');
    setStatus({ tone: 'info', message: 'Updating password...' });
    setLoading(true);
    try {
      const verify = await authService.verifyResetCode(email.trim().toLowerCase(), code.trim());
      const resetToken = verify.data?.resetToken;
      if (!resetToken) {
        throw new Error('Reset token missing. Request a new code and try again.');
      }
      await authService.resetWithToken(resetToken, password);
      setStatus({ tone: 'success', message: 'Password updated successfully.' });
      setPassword('');
      setConfirm('');
      setCode('');
    } catch (err: any) {
      setStatus(null);
      setError(friendlyError(err, 'We could not update your password.'));
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    code.trim().length === 6 && STRONG_PASSWORD.test(password) && password === confirm;

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Change Password</h2>
        {status && <p className={`status-message status-${status.tone}`}>{status.message}</p>}
        {error && <p className="error-message">{error}</p>}

        <form onSubmit={handleSendCode} className="auth-form">
          <label>
            <span>Email</span>
            <input type="email" value={email} disabled placeholder="you@example.com" />
          </label>
          <button type="submit" className="btn-secondary" disabled={sending || !email}>
            {sending ? 'Sending...' : codeSent ? 'Resend code' : 'Send verification code'}
          </button>
        </form>

        <form onSubmit={handleChangePassword} className="auth-form">
          <label>
            <span>Verification Code</span>
            <input
              type="text"
              name="code"
              inputMode="numeric"
              placeholder="6-digit code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
          </label>
          <label>
            <span>New Password</span>
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="At least 8 chars, upper/lower, number"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
            <span className="muted">{PASSWORD_HINT}</span>
          </label>
          <label>
            <span>Confirm Password</span>
            <div className="password-field">
              <input
                type={showConfirm ? 'text' : 'password'}
                name="confirm"
                placeholder="Repeat new password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
              />
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowConfirm((prev) => !prev)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                title={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? (
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
          <button type="submit" className="btn-primary" disabled={loading || !canSubmit}>
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
        <p className="auth-meta">
          Need help? <a href="/forgot-password">Use the reset password flow</a>
        </p>
      </div>
    </div>
  );
}
