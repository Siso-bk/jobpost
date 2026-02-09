'use client';
import { useEffect, useRef, useState } from 'react';
import { applicationsService, authService, usersService } from '@/services/api';
import { friendlyError } from '@/lib/feedback';
import { AppRole, hasRole, normalizeRoles } from '@/lib/roles';

type ApplyFormProps = {
  jobId: string;
};

type StatusTone = 'info' | 'success' | 'fail';

export default function ApplyForm({ jobId }: ApplyFormProps) {
  const [coverLetter, setCoverLetter] = useState('');
  const [resume, setResume] = useState('');
  const [loading, setLoading] = useState(false);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [cvLoading, setCvLoading] = useState(false);
  const [status, setStatus] = useState<{ tone: StatusTone; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<AppRole[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const statusTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    authService
      .me()
      .then((res) => {
        if (!active) return;
        setUserRoles(normalizeRoles(res.data?.roles));
        setUserId(res.data?.id || null);
      })
      .catch(() => {
        if (!active) return;
        setUserRoles([]);
        setUserId(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) {
        window.clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);

  const flashStatus = (tone: StatusTone, message: string, autoDismiss = true) => {
    setStatus({ tone, message });
    if (statusTimeoutRef.current) {
      window.clearTimeout(statusTimeoutRef.current);
    }
    if (autoDismiss && (tone === 'success' || tone === 'fail')) {
      statusTimeoutRef.current = window.setTimeout(() => {
        setStatus(null);
      }, 3500);
    }
  };

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
      setStatus(null);
      return;
    }
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Resume file must be under 2MB.');
      setStatus(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setResumeUploading(true);
        const res = await usersService.uploadResume(reader.result as string);
        setResume(res.data?.url || '');
        flashStatus('success', 'Resume uploaded successfully.');
        setError(null);
      } catch (uploadError: any) {
        const reason = friendlyError(
      uploadError,
      'We could not upload the resume. Please try again.'
    );
        flashStatus('fail', `Failed to upload resume: ${reason}`);
        setError(null);
      } finally {
        setResumeUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUseSavedCv = async () => {
    if (!userId) return;
    setCvLoading(true);
    flashStatus('info', 'Loading saved CV...', false);
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
          Array.isArray(profile.skills) && profile.skills.length
            ? `Skills: ${profile.skills.join(', ')}`
            : null,
          Array.isArray(profile.desiredRoles) && profile.desiredRoles.length
            ? `Desired roles: ${profile.desiredRoles.join(', ')}`
            : null,
          profile.yearsExperience !== undefined
            ? `Experience: ${profile.yearsExperience} years`
            : null,
          profile.portfolioUrl ? `Website / Social: ${profile.portfolioUrl}` : null,
          profile.linkedinUrl ? `LinkedIn: ${profile.linkedinUrl}` : null,
          profile.githubUrl ? `GitHub: ${profile.githubUrl}` : null,
        ].filter(Boolean);
        setResume(summaryParts.join('\n'));
      }
      flashStatus('success', 'Saved CV loaded.');
    } catch (e: any) {
      const reason = friendlyError(e, 'We could not load your saved CV. Please try again.');
      flashStatus('fail', `Failed to load saved CV: ${reason}`);
      setError(null);
    } finally {
      setCvLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    flashStatus('info', 'Submitting your application...', false);
    setError(null);
    try {
      await applicationsService.applyForJob(jobId, { coverLetter, resume });
      flashStatus('success', 'Application submitted successfully.');
      setCoverLetter('');
      setResume('');
    } catch (e: any) {
      const reason = friendlyError(e, 'We could not submit your application. Please try again.');
      flashStatus('fail', `Failed to submit application: ${reason}`);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const isWorker = hasRole(userRoles, 'worker');
  if (userRoles.length && !isWorker) {
    return (
      <div className="apply-card" id="apply">
        <h3>Apply for this job</h3>
        <p className="muted">Only worker accounts can apply to jobs.</p>
      </div>
    );
  }

  return (
    <div className="apply-card" id="apply">
      <h3>Apply for this job</h3>
      <p className="muted">Share a quick cover letter and a resume link or summary.</p>
      {status && <p className={`status-message status-${status.tone}`}>{status.message}</p>}
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
          <button
            type="button"
            className="btn-ghost"
            onClick={handleUseSavedCv}
            disabled={cvLoading}
          >
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

