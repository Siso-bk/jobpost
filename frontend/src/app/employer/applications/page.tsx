"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { applicationsService } from '@/services/api';

type Job = {
  _id: string;
  title: string;
  company: string;
  location: string;
};

type Worker = {
  _id: string;
  name?: string;
  email?: string;
};

type Application = {
  _id: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  createdAt: string;
  jobId?: Job | null;
  workerId?: Worker | null;
};

export default function EmployerApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true);
      try {
        const res = await applicationsService.getEmployerApplications();
        setApplications(res.data || []);
        setError(null);
      } catch (e: any) {
        const message = e?.response?.data?.message || e?.message || 'Failed to load applications';
        setError(message);
        setApplications([]);
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, []);

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return 'Unknown date';
    return date.toISOString().slice(0, 10);
  };

  const handleStatusChange = async (applicationId: string, status: Application['status']) => {
    setSavingId(applicationId);
    try {
      await applicationsService.updateApplicationStatus(applicationId, status);
      setApplications((prev) =>
        prev.map((app) => (app._id === applicationId ? { ...app, status } : app))
      );
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update status');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="page-container">
      <div className="applications-header">
        <div>
          <h1>Applications</h1>
          <p className="muted">Review applicants and update their status.</p>
        </div>
        <Link className="btn-secondary" href="/employer/jobs">View my jobs</Link>
      </div>

      {error && <p className="error-message">{error}</p>}

      {loading ? (
        <p className="loading">Loading applications...</p>
      ) : applications.length === 0 ? (
        <div className="empty-state">
          <strong>No applications yet.</strong>
          <p>Applicants will appear here once they apply to your jobs.</p>
        </div>
      ) : (
        <div className="applications-grid">
          {applications.map((application) => (
            <div key={application._id} className="application-card">
              <div className="application-head">
                <div>
                  <h3>{application.jobId?.title || 'Role unavailable'}</h3>
                  <p className="muted">{application.workerId?.name || 'Applicant'}</p>
                </div>
                <span className={`status-pill status-${application.status}`}>{application.status}</span>
              </div>
              <div className="application-meta">
                <span>{application.workerId?.email || 'No email'}</span>
                <span className="dot">|</span>
                <span>{application.jobId?.location || 'Location TBD'}</span>
                <span className="dot">|</span>
                <span>Applied {formatDate(application.createdAt)}</span>
              </div>
              <div className="application-actions">
                {application.jobId?._id ? (
                  <Link href={`/job/${application.jobId._id}`}>View job</Link>
                ) : (
                  <span className="muted">Job not available</span>
                )}
                <Link href={`/employer/applications/${application._id}`}>View application</Link>
                <select
                  value={application.status}
                  onChange={(e) => handleStatusChange(application._id, e.target.value as Application['status'])}
                  disabled={savingId === application._id}
                >
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
