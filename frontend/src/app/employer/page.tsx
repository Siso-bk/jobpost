"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { applicationsService, jobsService } from '@/services/api';

type Job = {
  _id: string;
  title: string;
  status: 'open' | 'closed';
  createdAt: string;
};

type Application = {
  _id: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  createdAt: string;
  jobId?: { _id: string; title: string } | null;
  workerId?: { name?: string; email?: string } | null;
};

export default function EmployerDashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [jobsRes, appsRes] = await Promise.all([
          jobsService.getMyJobs(),
          applicationsService.getEmployerApplications(),
        ]);
        setJobs(jobsRes.data || []);
        setApplications(appsRes.data || []);
        setError(null);
      } catch (e: any) {
        const message = e?.response?.data?.message || e?.message || 'Failed to load dashboard';
        setError(message);
        setJobs([]);
        setApplications([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const openJobs = jobs.filter((job) => job.status === 'open').length;
  const closedJobs = jobs.filter((job) => job.status === 'closed').length;
  const pendingApps = applications.filter((app) => app.status === 'pending').length;

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return 'Unknown date';
    return date.toISOString().slice(0, 10);
  };

  return (
    <div className="page-container">
      <div className="dashboard-head">
        <div>
          <div className="eyebrow">Employer</div>
          <h1>Dashboard</h1>
          <p className="muted">Track listings and stay on top of applicants in one place.</p>
        </div>
        <div className="hero-actions">
          <Link className="btn-secondary" href="/employer/jobs">My jobs</Link>
          <Link className="btn-primary" href="/post-job">Post a job</Link>
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}

      {loading ? (
        <p className="loading">Loading dashboard...</p>
      ) : (
        <>
          <div className="dashboard-stats">
            <div className="stat-card">
              <span className="profile-label">Open jobs</span>
              <div className="stat-value">{openJobs}</div>
            </div>
            <div className="stat-card">
              <span className="profile-label">Closed jobs</span>
              <div className="stat-value">{closedJobs}</div>
            </div>
            <div className="stat-card">
              <span className="profile-label">Total applications</span>
              <div className="stat-value">{applications.length}</div>
            </div>
            <div className="stat-card">
              <span className="profile-label">Pending review</span>
              <div className="stat-value">{pendingApps}</div>
            </div>
          </div>

          <div className="dashboard-grid">
            <section className="card">
              <div className="dashboard-section-head">
                <h2>Recent applications</h2>
                <Link href="/employer/applications">View all</Link>
              </div>
              {applications.length === 0 ? (
                <p className="muted">Applications will appear here once candidates apply.</p>
              ) : (
                <div className="dashboard-list">
                  {applications.slice(0, 5).map((app) => (
                    <div key={app._id} className="dashboard-row">
                      <div>
                        <div className="dashboard-title">{app.jobId?.title || 'Role unavailable'}</div>
                        <div className="muted">{app.workerId?.name || app.workerId?.email || 'Applicant'}</div>
                      </div>
                      <div className="dashboard-meta">
                        <span className={`status-pill status-${app.status}`}>{app.status}</span>
                        <span className="muted">Applied {formatDate(app.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="card">
              <div className="dashboard-section-head">
                <h2>Latest job posts</h2>
                <Link href="/employer/jobs">Manage jobs</Link>
              </div>
              {jobs.length === 0 ? (
                <p className="muted">Create your first job listing to get started.</p>
              ) : (
                <div className="dashboard-list">
                  {jobs.slice(0, 5).map((job) => (
                    <div key={job._id} className="dashboard-row">
                      <div>
                        <div className="dashboard-title">{job.title}</div>
                        <div className="muted">Posted {formatDate(job.createdAt)}</div>
                      </div>
                      <span className={`status-pill status-${job.status}`}>{job.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
