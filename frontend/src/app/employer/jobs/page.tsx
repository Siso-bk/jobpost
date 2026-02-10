'use client';
import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import Link from 'next/link';
import { jobsService } from '@/services/api';
import { friendlyError } from '@/lib/feedback';

type Job = {
  _id: string;
  title: string;
  company: string;
  location: string;
  jobType: string;
  status: 'open' | 'closed';
  isHidden?: boolean;
  createdAt: string;
};

export default function EmployerJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [visibilityLoadingId, setVisibilityLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const res: any = await jobsService.getMyJobs();
        setJobs(res.data || []);
        setError(null);
        setStatus(null);
      } catch (e: any) {
        setError(friendlyError(e, 'We could not load your jobs. Please try again.'));
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  const handleDelete = async (jobId: string) => {
    const confirmDelete = window.confirm('Delete this job? This cannot be undone.');
    if (!confirmDelete) return;
    setDeletingId(jobId);
    setError(null);
    setStatus(null);
    try {
      await jobsService.deleteJob(jobId);
      setJobs((prev) => prev.filter((job) => job._id !== jobId));
      setStatus('Job deleted.');
    } catch (e: any) {
      setError(friendlyError(e, 'We could not delete that job. Please try again.'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleVisibility = async (job: Job) => {
    setVisibilityLoadingId(job._id);
    setError(null);
    setStatus(null);
    try {
      if (job.isHidden) {
        const res = (await jobsService.unhideJob(job._id)) as any;
        const updated = res.data?.job || { ...job, isHidden: false };
        setJobs((prev) => prev.map((item) => (item._id === job._id ? updated : item)));
        setStatus('Job is now visible to applicants.');
      } else {
        const res = (await jobsService.hideJob(job._id)) as any;
        const updated = res.data?.job || { ...job, isHidden: true };
        setJobs((prev) => prev.map((item) => (item._id === job._id ? updated : item)));
        setStatus('Job hidden from public listings.');
      }
    } catch (e: any) {
      setError(friendlyError(e, 'We could not update visibility. Please try again.'));
    } finally {
      setVisibilityLoadingId(null);
    }
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return 'Unknown date';
    return date.toISOString().slice(0, 10);
  };

  const buildShareLink = (jobId: string) => {
    const base =
      process.env.NEXT_PUBLIC_ORIGIN ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    const path = `/job/${jobId}#apply`;
    if (!base) return path;
    return `${base.replace(/\/$/, '')}${path}`;
  };

  const handleShareJob = async (event: MouseEvent<HTMLButtonElement>, job: Job) => {
    event.preventDefault();
    event.stopPropagation();
    setError(null);
    setStatus(null);
    const link = buildShareLink(job._id);
    const title = `${job.title} at ${job.company}`;
    const text = `Apply for ${job.title} at ${job.company}`;

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: link });
        setStatus('Share sheet opened.');
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        setStatus('Link copied.');
        return;
      }
      window.prompt('Copy this link', link);
      setStatus('Link ready to copy.');
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setError('Could not share the job link.');
    }
  };

  return (
    <div className="page-container">
      <div className="applications-header">
        <div>
          <h1>My jobs</h1>
          <p className="muted">Manage your job listings and keep them up to date.</p>
        </div>
        <Link className="btn-primary" href="/post-job">
          Post a job
        </Link>
      </div>

      {status && <p className="status-message">{status}</p>}
      {error && <p className="error-message">{error}</p>}

      {loading ? (
        <p className="loading">Loading jobs...</p>
      ) : jobs.length === 0 ? (
        <div className="empty-state">
          <strong>No jobs posted yet.</strong>
          <p>Create your first listing to start receiving applications.</p>
        </div>
      ) : (
        <div className="applications-grid">
          {jobs.map((job) => (
            <div key={job._id} className="application-card">
              <div className="application-head">
                <div>
                  <h3>{job.title}</h3>
                  <p className="muted">{job.company}</p>
                </div>
                <span className={`status-pill status-${job.isHidden ? 'hidden' : job.status}`}>
                  {job.isHidden ? 'hidden' : job.status}
                </span>
              </div>
              <div className="application-meta">
                <span>{job.location}</span>
                <span className="dot">|</span>
                <span>{job.jobType.replace('-', ' ')}</span>
                <span className="dot">|</span>
                <span>Posted {formatDate(job.createdAt)}</span>
              </div>
              <div className="application-actions">
                <Link href={`/job/${job._id}`}>View</Link>
                <Link href={`/post-job?id=${job._id}`}>Edit</Link>
                <button
                  type="button"
                  className="job-share-button"
                  onClick={(event) => handleShareJob(event, job)}
                  title="Share job"
                  aria-label="Share job"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M12 3l4 4h-3v6h-2V7H8l4-4zm-6 8v8h12v-8h2v10H4V11h2z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => handleToggleVisibility(job)}
                  disabled={visibilityLoadingId === job._id}
                >
                  {visibilityLoadingId === job._id
                    ? 'Updating...'
                    : job.isHidden
                      ? 'Unhide'
                      : 'Hide'}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => handleDelete(job._id)}
                  disabled={deletingId === job._id}
                >
                  {deletingId === job._id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
