"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/api';

export default function LoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authService.paiLogin(formData.email, formData.password);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userId', res.data.user.id);
      localStorage.setItem('userRole', res.data.user.role);
      router.push(res.data.user.role === 'employer' ? '/employer' : '/jobs');
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === 'email_not_verified') {
        setError('Email not verified. Please register to request a new code.');
      } else if (code === 'jobpost_profile_required') {
        setError('No JobPost profile found. Please register to choose your role.');
      } else {
        setError(err?.response?.data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Login</h2>
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
            <input
              type="password"
              name="password"
              placeholder="********"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </label>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <div className="auth-alt">
          <a className="btn-secondary" href="/api/personalai/authorize">Sign in with PersonalAI</a>
        </div>
        <p className="auth-meta">
          Don't have an account? <a href="/register">Register here</a>
        </p>
      </div>
    </div>
  );
}
