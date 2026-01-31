'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { applicationsService, conversationsService } from '@/services/api';
import { friendlyError } from '@/lib/feedback';

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
  phone?: string;
  chatApp?: string;
  chatHandle?: string;
  allowContact?: boolean;
};

type Application = {
  _id: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  createdAt: string;
  jobId?: Job | null;
  workerId?: Worker | null;
};

export default function EmployerApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [messageLoadingId, setMessageLoadingId] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true);
      try {
        const res = await applicationsService.getEmployerApplications();
        setApplications(res.data || []);
        setError(null);
        setStatusMessage(null);
      } catch (e: any) {
        setError(friendlyError(e, 'We could not load applications. Please try again.'));
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
    setStatusMessage(null);
    try {
      await applicationsService.updateApplicationStatus(applicationId, status);
      setApplications((prev) =>
        prev.map((app) => (app._id === applicationId ? { ...app, status } : app))
      );
      setStatusMessage('Application status updated.');
    } catch (e: any) {
      setError(friendlyError(e, 'We could not update the status. Please try again.'));
    } finally {
      setSavingId(null);
    }
  };

  const handleMessage = async (workerId?: string) => {
    if (!workerId) return;
    setMessageLoadingId(workerId);
    setError(null);
    setStatusMessage(null);
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

  const handleDelete = async (applicationId: string) => {
    const confirmed = window.confirm('Delete this application? This cannot be undone.');
    if (!confirmed) return;
    setDeleteLoadingId(applicationId);
    setError(null);
    setStatusMessage(null);
    try {
      await applicationsService.deleteApplication(applicationId);
      setApplications((prev) => prev.filter((app) => app._id !== applicationId));
      setStatusMessage('Application deleted.');
    } catch (e: any) {
      setError(friendlyError(e, 'We could not delete the application. Please try again.'));
    } finally {
      setDeleteLoadingId(null);
    }
  };

  return (
    <div className="page-container">
      <div className="applications-header">
        <div>
          <h1>Applications</h1>
          <p className="muted">Review applicants and update their status.</p>
        </div>
        <Link className="btn-secondary" href="/employer/jobs">
          View my jobs
        </Link>
      </div>

      {statusMessage && <p className="status-message">{statusMessage}</p>}
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
                <span className={`status-pill status-${application.status}`}>
                  {application.status}
                </span>
              </div>
              <div className="application-meta">
                <span>
                  {application.workerId?.allowContact
                    ? application.workerId?.email || 'No email'
                    : 'Contact locked'}
                </span>
                <span className="dot">|</span>
                <span>{application.jobId?.location || 'Location TBD'}</span>
                <span className="dot">|</span>
                <span>Applied {formatDate(application.createdAt)}</span>
              </div>
              {application.workerId?.allowContact && (
                <div className="contact-row">
                  {application.workerId?.phone && (
                    <a href={`tel:${application.workerId.phone}`}>Call</a>
                  )}
                  {application.workerId?.email && (
                    <a href={`mailto:${application.workerId.email}`}>Email</a>
                  )}
                  {(application.workerId?.chatApp || application.workerId?.chatHandle) && (
                    <span className="muted">
                      {application.workerId.chatApp || 'Chat'}{' '}
                      {application.workerId.chatHandle || ''}
                    </span>
                  )}
                </div>
              )}
              <div className="application-actions">
                {application.jobId?._id ? (
                  <Link href={`/job/${application.jobId._id}`}>View job</Link>
                ) : (
                  <span className="muted">Job not available</span>
                )}
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => handleMessage(application.workerId?._id)}
                  disabled={messageLoadingId === application.workerId?._id}
                >
                  {messageLoadingId === application.workerId?._id ? 'Opening...' : 'Message'}
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => handleDelete(application._id)}
                  disabled={deleteLoadingId === application._id}
                >
                  {deleteLoadingId === application._id ? 'Deleting...' : 'Delete'}
                </button>
                <Link href={`/employer/applications/${application._id}`}>View application</Link>
                <select
                  value={application.status}
                  onChange={(e) =>
                    handleStatusChange(application._id, e.target.value as Application['status'])
                  }
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
