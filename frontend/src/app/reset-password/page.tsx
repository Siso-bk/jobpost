'use client';
import React, { useState } from 'react';
import { authService } from '@/services/api';
import { friendlyError } from '@/lib/feedback';

export default function ResetPasswordPage() {
  const [formData, setFormData] = useState({
    email: '',
    code: '',
    password: '',
    confirm: ''
  });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (formData.password !== formData.confirm) {
      setError('Passwords must match.');
      return;
    }
    setError('');
    setStatus('Resetting password...');
    setLoading(true);
    try {
      await authService.resetPassword(
        formData.email.trim().toLowerCase(),
        formData.code.trim(),
        formData.password
      );
      setStatus('Password reset successfully. Sign in with your new password.');
      setCompleted(true);
    } catch (err: any) {
      setStatus('');
      setError(friendlyError(err, 'We could not reset your password.'));
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    formData.email.trim() &&
    formData.code.trim().length === 6 &&
    formData.password &&
    formData.confirm &&
    formData.password === formData.confirm;

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Reset Password</h2>
        {status && <p className="status-message">{status}</p>}
        {error && <p className="error-message">{error}</p>}
        {!completed && (
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
            <label>
              <span>New Password</span>
              <input
                type="password"
                name="password"
                placeholder="At least 8 chars, upper/lower, number"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              <span>Confirm Password</span>
              <input
                type="password"
                name="confirm"
                placeholder="Repeat new password"
                value={formData.confirm}
                onChange={handleChange}
                required
              />
            </label>
            <button type="submit" className="btn-primary" disabled={loading || !canSubmit}>
              {loading ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        )}
        {completed && (
          <p className="status-message">
            Password reset complete. <a href="/login">Sign in</a>
          </p>
        )}
        <p className="auth-meta">
          Need a new code? <a href="/forgot-password">Request another code</a>
        </p>
      </div>
    </div>
  );
}
