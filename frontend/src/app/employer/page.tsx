'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { applicationsService, conversationsService, jobsService } from '@/services/api';
import { friendlyError } from '@/lib/feedback';

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
  workerId?: { _id: string; name?: string; email?: string } | null;
};

export default function EmployerDashboardPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageLoadingId, setMessageLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const jobsRes = (await jobsService.getMyJobs()) as any;
        const appsRes = (await applicationsService.getEmployerApplications()) as any;
        setJobs(jobsRes.data || []);
        setApplications(appsRes.data || []);
        setError(null);
      } catch (e: any) {
        setError(friendlyError(e, 'We could not load the dashboard. Please try again.'));
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

  const handleMessage = async (workerId?: string) => {
    if (!workerId) return;
    setMessageLoadingId(workerId);
    setError(null);
    try {
      const res = await conversationsService.create(workerId);
      const conversationId = res.data?.id || res.data?._id;
      if (conversationId) {
        router.push(`/messages?c=${conversationId}`);
      } else {
        setError('Unable to start chat');
      }
    } catch (e: any) {
      setError(friendlyError(e, 'We could not start a chat. Please try again.'));
    } finally {
      setMessageLoadingId(null);
    }
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
          <Link className="btn-secondary" href="/employer/jobs">
            My jobs
          </Link>
          <Link className="btn-primary" href="/post-job">
            Post a job
          </Link>
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
                        <div className="dashboard-title">
                          {app.jobId?.title || 'Role unavailable'}
                        </div>
                        <div className="muted">
                          {app.workerId?.name || app.workerId?.email || 'Applicant'}
                        </div>
                        <div className="dashboard-actions">
                          <Link href={`/employer/applications/${app._id}`}>View</Link>
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => handleMessage(app.workerId?._id)}
                            disabled={messageLoadingId === app.workerId?._id}
                          >
                            {messageLoadingId === app.workerId?._id ? 'Opening...' : 'Message'}
                          </button>
                        </div>
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
