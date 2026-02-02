'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/api';
import { friendlyError } from '@/lib/feedback';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setStatus('Sending verification code...');
    setLoading(true);
    try {
      await authService.forgotPassword(email.trim().toLowerCase());
      setStatus('Verification code sent. Redirecting to enter the code...');
      setCodeSent(true);
      router.push(`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err: any) {
      setStatus('');
      setError(friendlyError(err, 'We could not send the verification code.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Forgot Password</h2>
        {status && <p className="status-message">{status}</p>}
        {error && <p className="error-message">{error}</p>}
        {!codeSent && (
          <form onSubmit={handleSubmit} className="auth-form">
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
            <button type="submit" className="btn-primary" disabled={loading || !email.trim()}>
              {loading ? 'Sending...' : 'Send verification code'}
            </button>
          </form>
        )}
        {codeSent && (
          <p className="status-message">
            Once you receive the code, go to{' '}
            <a href="/reset-password" className="highlight-link">
              Reset Password
            </a>{' '}
            to finish.
          </p>
        )}
        <p className="auth-meta">
          Remembered your password? <a href="/login">Sign in</a>
        </p>
      </div>
    </div>
  );
}
