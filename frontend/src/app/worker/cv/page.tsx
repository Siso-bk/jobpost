'use client';
import { useEffect, useState } from 'react';
import { authService, usersService } from '@/services/api';
import { friendlyError } from '@/lib/feedback';

type CvForm = {
  headline: string;
  summary: string;
  skills: string;
  desiredRoles: string;
  yearsExperience: string;
  availability: string;
  portfolioUrl: string;
  linkedinUrl: string;
  githubUrl: string;
  phone: string;
  chatApp: string;
  chatHandle: string;
  allowContact: boolean;
  isDiscoverable: boolean;
  resumeUrl: string;
};

export default function WorkerCvPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [form, setForm] = useState<CvForm>({
    headline: '',
    summary: '',
    skills: '',
    desiredRoles: '',
    yearsExperience: '',
    availability: 'open',
    portfolioUrl: '',
    linkedinUrl: '',
    githubUrl: '',
    phone: '',
    chatApp: '',
    chatHandle: '',
    allowContact: false,
    isDiscoverable: true,
    resumeUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    authService
      .me()
      .then((res) => {
        if (!active) return;
        setUserId(res.data?.id || null);
        setUserRole(res.data?.role || null);
      })
      .catch(() => {
        if (!active) return;
        setUserId(null);
        setUserRole(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    usersService
      .getUserProfile(userId)
      .then((res) => {
        const data = res.data || {};
        setForm({
          headline: data.headline || '',
          summary: data.summary || '',
          skills: Array.isArray(data.skills) ? data.skills.join(', ') : '',
          desiredRoles: Array.isArray(data.desiredRoles) ? data.desiredRoles.join(', ') : '',
          yearsExperience:
            data.yearsExperience !== undefined && data.yearsExperience !== null
              ? String(data.yearsExperience)
              : '',
          availability: data.availability || 'open',
          portfolioUrl: data.portfolioUrl || '',
          linkedinUrl: data.linkedinUrl || '',
          githubUrl: data.githubUrl || '',
          phone: data.phone || '',
          chatApp: data.chatApp || '',
          chatHandle: data.chatHandle || '',
          allowContact: data.allowContact === true,
          isDiscoverable: data.isDiscoverable !== false,
          resumeUrl: data.resumeUrl || '',
        });
        setError(null);
      })
      .catch((e) => setError(friendlyError(e, 'We could not load your CV. Please try again.')))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const parseList = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (!allowedTypes.includes(file.type)) {
      setError('Resume must be a PDF, DOC, DOCX, or TXT file.');
      return;
    }
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Resume file must be under 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setResumeUploading(true);
        const dataUrl = reader.result as string;
        const res = await usersService.uploadResume(dataUrl);
        setForm((prev) => ({ ...prev, resumeUrl: res.data?.url || '' }));
        setMessage('Resume uploaded successfully.');
        setError(null);
      } catch (uploadError: any) {
        setError(friendlyError(uploadError, 'We could not upload the resume. Please try again.'));
      } finally {
        setResumeUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload = {
        headline: form.headline,
        summary: form.summary,
        skills: parseList(form.skills),
        desiredRoles: parseList(form.desiredRoles),
        yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : undefined,
        availability: form.availability,
        portfolioUrl: form.portfolioUrl,
        linkedinUrl: form.linkedinUrl,
        githubUrl: form.githubUrl,
        phone: form.phone,
        chatApp: form.chatApp,
        chatHandle: form.chatHandle,
        allowContact: form.allowContact,
        isDiscoverable: form.isDiscoverable,
        resumeUrl: form.resumeUrl || '',
      };
      await usersService.updateProfile(userId, payload);
      setMessage('CV updated successfully');
    } catch (e: any) {
      setError(friendlyError(e, 'We could not update your CV. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  if (!userId) {
    return (
      <div className="page-container">
        <div className="form-card">
          <h2>Complete your CV</h2>
          <p className="muted">Log in to build your public worker profile.</p>
        </div>
      </div>
    );
  }

  if (userRole && userRole !== 'worker') {
    return (
      <div className="page-container">
        <div className="form-card">
          <h2>Worker CV</h2>
          <p className="muted">This section is only available for worker accounts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="form-card">
        <div className="eyebrow">Worker</div>
        <h2>My CV</h2>
        <p className="muted">Share your experience so employers can find and contact you.</p>
        {message && <p className="status-message">{message}</p>}
        {error && <p className="error-message">{error}</p>}
        {loading ? (
          <p className="loading">Loading CV...</p>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              <span>Headline</span>
              <input
                name="headline"
                value={form.headline}
                onChange={handleChange}
                placeholder="Frontend Engineer | React + Next.js"
              />
            </label>
            <label>
              <span>Summary</span>
              <textarea
                name="summary"
                value={form.summary}
                onChange={handleChange}
                placeholder="Share your strengths, recent work, and what roles you want."
              />
            </label>
            <label>
              <span>Skills (comma separated)</span>
              <input
                name="skills"
                value={form.skills}
                onChange={handleChange}
                placeholder="React, TypeScript, Figma"
              />
            </label>
            <label>
              <span>Desired roles (comma separated)</span>
              <input
                name="desiredRoles"
                value={form.desiredRoles}
                onChange={handleChange}
                placeholder="Frontend Engineer, UI Developer"
              />
            </label>
            <div className="form-grid">
              <label>
                <span>Years of experience</span>
                <input
                  name="yearsExperience"
                  type="number"
                  value={form.yearsExperience}
                  onChange={handleChange}
                  placeholder="3"
                />
              </label>
              <label>
                <span>Availability</span>
                <select name="availability" value={form.availability} onChange={handleChange}>
                  <option value="open">Open to offers</option>
                  <option value="immediately">Immediately</option>
                  <option value="2-weeks">2 weeks</option>
                  <option value="1-month">1 month</option>
                </select>
              </label>
            </div>
            <label>
              <span>Portfolio URL</span>
              <input
                name="portfolioUrl"
                value={form.portfolioUrl}
                onChange={handleChange}
                placeholder="https://..."
              />
            </label>
            <label>
              <span>LinkedIn URL</span>
              <input
                name="linkedinUrl"
                value={form.linkedinUrl}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/..."
              />
            </label>
            <label>
              <span>GitHub URL</span>
              <input
                name="githubUrl"
                value={form.githubUrl}
                onChange={handleChange}
                placeholder="https://github.com/..."
              />
            </label>
            <label>
              <span>Resume file (PDF, DOC, DOCX, TXT)</span>
              <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleResumeUpload} />
              {form.resumeUrl && (
                <div className="resume-row">
                  <a href={form.resumeUrl} target="_blank" rel="noreferrer">
                    View uploaded resume
                  </a>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setForm((prev) => ({ ...prev, resumeUrl: '' }))}
                  >
                    Remove
                  </button>
                </div>
              )}
              {resumeUploading && <span className="muted">Uploading resume...</span>}
            </label>
            <label>
              <span>Phone</span>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+1 555 000 0000"
              />
            </label>
            <label>
              <span>Chat app</span>
              <input
                name="chatApp"
                value={form.chatApp}
                onChange={handleChange}
                placeholder="WhatsApp, Telegram, Discord"
              />
            </label>
            <label>
              <span>Chat handle</span>
              <input
                name="chatHandle"
                value={form.chatHandle}
                onChange={handleChange}
                placeholder="@username"
              />
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                name="allowContact"
                checked={form.allowContact}
                onChange={handleChange}
              />
              <span>Allow employers to contact me</span>
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                name="isDiscoverable"
                checked={form.isDiscoverable}
                onChange={handleChange}
              />
              <span>Make my profile discoverable to employers</span>
            </label>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save CV'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
