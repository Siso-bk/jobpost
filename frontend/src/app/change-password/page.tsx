'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/api';
import { friendlyError } from '@/lib/feedback';

type StatusTone = 'info' | 'success' | 'fail';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<{ tone: StatusTone; message: string } | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

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

  const handleVerifyCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!code.trim()) return;
    setError('');
    setStatus({ tone: 'info', message: 'Verifying code...' });
    setVerifying(true);
    try {
      const verify = await authService.verifyResetCode(email.trim().toLowerCase(), code.trim());
      const resetToken = verify.data?.resetToken || verify.data?.token;
      if (!resetToken) {
        throw new Error('Reset token missing. Request a new code and try again.');
      }
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('reset_token', resetToken);
        sessionStorage.setItem('reset_email', email.trim().toLowerCase());
      }
      setStatus({
        tone: 'success',
        message: 'Code verified. Redirecting to set a new password...',
      });
      router.push('/reset-password?mode=change');
    } catch (err: any) {
      setStatus(null);
      setError(friendlyError(err, 'We could not verify that code.'));
    } finally {
      setVerifying(false);
    }
  };

  const canVerify = code.trim().length === 6;

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Change Password</h2>
        {status && (
          <p className={'status-message status-' + status.tone}>{status.message}</p>
        )}
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

        <form onSubmit={handleVerifyCode} className="auth-form">
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
          <p className="muted">
            After verification, you will set a new password on the next screen.
          </p>
          <button
            type="submit"
            className="btn-primary"
            disabled={verifying || !canVerify || !codeSent}
          >
            {verifying ? 'Verifying...' : 'Verify code'}
          </button>
        </form>
        <p className="auth-meta">
          Need help? <a href="/forgot-password">Use the reset password flow</a>
        </p>
      </div>
    </div>
  );
}

