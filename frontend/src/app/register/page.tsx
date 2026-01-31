'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/api';

type Step = 'email' | 'code' | 'details';
type Flow = 'new' | 'existing';

export default function RegisterPage() {
  const [authMode, setAuthMode] = useState<'pai' | 'local'>('pai');
  const [step, setStep] = useState<Step>('email');
  const [flow, setFlow] = useState<Flow>('new');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [preToken, setPreToken] = useState<string | null>(null);
  const [details, setDetails] = useState({ name: '', handle: '', password: '', role: 'worker' });
  const [localDetails, setLocalDetails] = useState({
    name: '',
    email: '',
    password: '',
    role: 'worker',
  });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    authService
      .me()
      .then((res) => {
        if (!active) return;
        const role = res.data?.role;
        if (role) {
          router.replace(role === 'employer' ? '/employer' : '/jobs');
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [router]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setStatus('Sending verification code...');
    setDevCode(null);
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const res = await authService.paiSignup(normalizedEmail);
      const data = res.data || {};
      if (data.exists) {
        if (data.emailVerified) {
          setError('Account already exists. Please log in.');
          setStatus('Redirecting to login...');
          setTimeout(() => {
            router.push(`/login?email=${encodeURIComponent(normalizedEmail)}`);
          }, 700);
          return;
        }
        const resend = await authService.paiResend(normalizedEmail);
        const resendBody = resend.data || {};
        setFlow('existing');
        setStep('code');
        setStatus(resendBody.message || 'We sent a new verification code to your email.');
        if (resendBody.devVerificationCode) setDevCode(resendBody.devVerificationCode);
      } else {
        setFlow('new');
        setStep('code');
        setStatus(data.message || 'Check your email for the 6-digit code.');
        if (data.devVerificationCode) setDevCode(data.devVerificationCode);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to send verification code.');
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setStatus('Verifying code...');
    try {
      if (flow === 'existing') {
        const res = await authService.paiVerifyCode({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          role: details.role,
        });
        router.push(res.data.user.role === 'employer' ? '/employer' : '/jobs');
        return;
      }
      const res = await authService.paiSignupVerify(email.trim().toLowerCase(), code.trim());
      if (!res.data?.preToken) {
        throw new Error('Missing verification token');
      }
      setPreToken(res.data.preToken);
      setStep('details');
      setStatus('Code verified. Complete your profile.');
      setDevCode(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to verify code.');
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preToken) {
      setError('Verification expired. Restart signup.');
      setStep('email');
      return;
    }
    setLoading(true);
    setError('');
    setStatus('Creating your account...');
    try {
      const res = await authService.paiSignupComplete({
        preToken,
        name: details.name.trim(),
        handle: details.handle.trim(),
        password: details.password,
        role: details.role,
      });
      router.push(res.data.user.role === 'employer' ? '/employer' : '/jobs');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to finish signup.');
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  const handleLocalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setStatus('Creating your account...');
    try {
      const res = await authService.localRegister({
        name: localDetails.name.trim(),
        email: localDetails.email.trim().toLowerCase(),
        password: localDetails.password,
        role: localDetails.role,
      });
      router.push(res.data.user.role === 'employer' ? '/employer' : '/jobs');
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === 'use_pai_login') {
        setError('This email is managed by PersonalAI. Switch to PersonalAI signup.');
      } else {
        setError(err?.response?.data?.message || 'Unable to create account.');
      }
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim()) {
      setResendMessage('Enter your email first.');
      return;
    }
    setResendLoading(true);
    setResendMessage('Sending a new code...');
    setDevCode(null);
    try {
      const res = await authService.paiResend(email.trim().toLowerCase());
      const data = res.data || {};
      setResendMessage(data.message || 'If the account exists, a new code was sent.');
      if (data.devVerificationCode) setDevCode(data.devVerificationCode);
    } catch (err: any) {
      setResendMessage(err?.response?.data?.message || 'Unable to resend code.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    setDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    setLocalDetails((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Create Account</h2>
        <div className="auth-alt">
          <button
            type="button"
            className={authMode === 'pai' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => {
              setAuthMode('pai');
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
              setError('');
              setStatus('');
            }}
          >
            Local account
          </button>
        </div>
        {status && <p className="status-message">{status}</p>}
        {error && <p className="error-message">{error}</p>}
        {devCode && <p className="status-message">Dev code: {devCode}</p>}

        {authMode === 'pai' && step === 'email' && (
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
              {loading ? 'Sending...' : 'Send code'}
            </button>
          </form>
        )}

        {authMode === 'pai' && step === 'code' && (
          <form onSubmit={handleCodeSubmit} className="auth-form">
            <label>
              <span>Verification code</span>
              <input
                type="text"
                name="code"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </label>
            {flow === 'existing' && (
              <label>
                <span>Role</span>
                <select name="role" value={details.role} onChange={handleDetailsChange}>
                  <option value="worker">Worker</option>
                  <option value="employer">Employer</option>
                </select>
              </label>
            )}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleResend}
              disabled={resendLoading}
            >
              {resendLoading ? 'Resending...' : 'Resend code'}
            </button>
            {resendMessage && <p className="status-message">{resendMessage}</p>}
          </form>
        )}

        {authMode === 'pai' && step === 'details' && (
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
              <span>PAI Handle</span>
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
              <input
                type="password"
                name="password"
                placeholder="********"
                value={details.password}
                onChange={handleDetailsChange}
                required
              />
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

        {authMode === 'local' && (
          <form onSubmit={handleLocalSubmit} className="auth-form">
            <label>
              <span>Full Name</span>
              <input
                type="text"
                name="name"
                placeholder="Jane Doe"
                value={localDetails.name}
                onChange={handleLocalChange}
                required
              />
            </label>
            <label>
              <span>Email</span>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={localDetails.email}
                onChange={handleLocalChange}
                required
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                name="password"
                placeholder="********"
                value={localDetails.password}
                onChange={handleLocalChange}
                required
              />
            </label>
            <label>
              <span>Role</span>
              <select name="role" value={localDetails.role} onChange={handleLocalChange}>
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
