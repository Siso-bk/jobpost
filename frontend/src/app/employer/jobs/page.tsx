'use client';
import { useEffect, useState } from 'react';
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
  createdAt: string;
};

export default function EmployerJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const res = await jobsService.getMyJobs();
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

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return 'Unknown date';
    return date.toISOString().slice(0, 10);
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
                <span className={`status-pill status-${job.status}`}>{job.status}</span>
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
