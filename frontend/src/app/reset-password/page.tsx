'use client';
import React, { useEffect, useState } from 'react';
import { authService } from '@/services/api';
import { friendlyError } from '@/lib/feedback';

type Step = 'verify' | 'reset';
type StatusTone = 'info' | 'success' | 'fail';

export default function ResetPasswordPage() {
  const [step, setStep] = useState<Step>('verify');
  const [formData, setFormData] = useState({
    email: '',
    code: '',
    password: '',
    confirm: '',
  });
  const [status, setStatus] = useState<{ tone: StatusTone; message: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const prefilled = params.get('email');
    if (prefilled) {
      setFormData((prev) => ({ ...prev, email: prefilled }));
    }
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setStatus({ tone: 'info', message: 'Verifying code...' });
    setLoading(true);
    try {
      const res = await authService.verifyResetCode(
        formData.email.trim().toLowerCase(),
        formData.code.trim()
      );
      setResetToken(res.data?.resetToken || null);
      setStep('reset');
      setStatus({ tone: 'success', message: 'Code verified. Enter a new password below.' });
    } catch (err: any) {
      setStatus(null);
      setError(friendlyError(err, 'We could not verify that code.'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resetToken) return;
    if (formData.password !== formData.confirm) {
      setError('Passwords must match.');
      setStatus(null);
      return;
    }
    setError('');
    setStatus({ tone: 'info', message: 'Resetting password...' });
    setLoading(true);
    try {
      await authService.resetWithToken(resetToken, formData.password);
      setStatus({
        tone: 'success',
        message: 'Password reset successfully. Sign in with your new password.',
      });
      setStep('verify');
      setFormData((prev) => ({ ...prev, password: '', confirm: '' }));
      setResetToken(null);
    } catch (err: any) {
      setStatus(null);
      setError(friendlyError(err, 'We could not reset your password.'));
    } finally {
      setLoading(false);
    }
  };

  const canVerify = formData.email.trim() && formData.code.trim().length === 6;
  const canReset =
    formData.password &&
    formData.confirm &&
    formData.password === formData.confirm &&
    Boolean(resetToken);

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Reset Password</h2>
        {status && (
          <p className={`status-message status-${status.tone}`}>{status.message}</p>
        )}
        {error && <p className="error-message">{error}</p>}
        {step === 'verify' && (
          <form onSubmit={handleVerify} className="auth-form">
            <label>
              <span>Email</span>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              <span>Verification Code</span>
              <input
                type="text"
                name="code"
                inputMode="numeric"
                placeholder="6-digit code"
                value={formData.code}
                onChange={handleChange}
                required
              />
            </label>
            <button type="submit" className="btn-primary" disabled={loading || !canVerify}>
              {loading ? 'Verifying...' : 'Verify code'}
            </button>
          </form>
        )}
        {step === 'reset' && (
          <form onSubmit={handleReset} className="auth-form">
            <label>
              <span>New Password</span>
              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="At least 8 chars, upper/lower, number"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
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
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
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
              <span>Confirm Password</span>
              <div className="password-field">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirm"
                  placeholder="Repeat new password"
                  value={formData.confirm}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setShowConfirm((prev) => !prev)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? (
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
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
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
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
            <button type="submit" className="btn-primary" disabled={loading || !canReset}>
              {loading ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        )}
        <p className="auth-meta">
          Need a new code? <a href="/forgot-password">Request another code</a>
        </p>
      </div>
    </div>
  );
}
