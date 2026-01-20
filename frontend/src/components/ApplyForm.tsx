"use client";
import { useEffect, useState } from 'react';
import { applicationsService, usersService } from '@/services/api';

type ApplyFormProps = {
  jobId: string;
};

export default function ApplyForm({ jobId }: ApplyFormProps) {
  const [coverLetter, setCoverLetter] = useState('');
  const [resume, setResume] = useState('');
  const [loading, setLoading] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [cvLoading, setCvLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setUserRole(localStorage.getItem('userRole'));
      setUserId(localStorage.getItem('userId'));
    } catch {}
  }, []);

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        const res = await usersService.uploadResume(reader.result as string);
        setResume(res.data?.url || '');
        setMessage('Resume uploaded successfully.');
        setError(null);
      } catch (uploadError: any) {
        setError(uploadError?.response?.data?.message || 'Failed to upload resume.');
      } finally {
        setResumeUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUseSavedCv = async () => {
    if (!userId) return;
    setCvLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await usersService.getUserProfile(userId);
      const profile = res.data || {};
      if (profile.resumeUrl) {
        setResume(profile.resumeUrl);
      } else {
        const summaryParts = [
          profile.headline ? `Headline: ${profile.headline}` : null,
          profile.summary ? `Summary: ${profile.summary}` : null,
          Array.isArray(profile.skills) && profile.skills.length ? `Skills: ${profile.skills.join(', ')}` : null,
          Array.isArray(profile.desiredRoles) && profile.desiredRoles.length ? `Desired roles: ${profile.desiredRoles.join(', ')}` : null,
          profile.yearsExperience !== undefined ? `Experience: ${profile.yearsExperience} years` : null,
          profile.portfolioUrl ? `Portfolio: ${profile.portfolioUrl}` : null,
          profile.linkedinUrl ? `LinkedIn: ${profile.linkedinUrl}` : null,
          profile.githubUrl ? `GitHub: ${profile.githubUrl}` : null,
        ].filter(Boolean);
        setResume(summaryParts.join('\n'));
      }
      setMessage('Saved CV loaded.');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load saved CV.');
    } finally {
      setCvLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      await applicationsService.applyForJob(jobId, { coverLetter, resume });
      setMessage('Application submitted successfully.');
      setCoverLetter('');
      setResume('');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to submit application.');
    } finally {
      setLoading(false);
    }
  };

  if (userRole && userRole !== 'worker') {
    return (
      <div className="apply-card">
        <h3>Apply for this job</h3>
        <p className="muted">Only worker accounts can apply to jobs.</p>
      </div>
    );
  }

  return (
    <div className="apply-card">
      <h3>Apply for this job</h3>
      <p className="muted">Share a quick cover letter and a resume link or summary.</p>
      {message && <p>{message}</p>}
      {error && <p className="error-message">{error}</p>}
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span>Cover letter</span>
          <textarea
            name="coverLetter"
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            placeholder="Introduce yourself and why you are a good fit."
          />
        </label>
        <label>
          <span>Resume (link or short summary)</span>
          <textarea
            name="resume"
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="https://... or brief summary"
          />
        </label>
        <div className="apply-actions">
          <label className="upload-inline">
            <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleResumeUpload} />
            <span>{resumeUploading ? 'Uploading resume...' : 'Upload from device'}</span>
          </label>
          <button type="button" className="btn-ghost" onClick={handleUseSavedCv} disabled={cvLoading}>
            {cvLoading ? 'Loading CV...' : 'Use saved CV'}
          </button>
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit application'}
        </button>
      </form>
    </div>
  );
}
