'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { applicationsService, conversationsService } from '@/services/api';

type Job = {
  _id: string;
  title: string;
  company: string;
  location: string;
  jobType?: string;
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
  coverLetter?: string;
  resume?: string;
  jobId?: Job | null;
  workerId?: Worker | null;
};

export default function EmployerApplicationDetailPage() {
  const params = useParams();
  const applicationId = (params?.id as string) || '';
  const router = useRouter();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageLoading, setMessageLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!applicationId) return;
    setLoading(true);
    applicationsService
      .getApplicationById(applicationId)
      .then((res) => {
        setApplication(res.data);
        setError(null);
      })
      .catch((e: any) => setError(e?.response?.data?.message || 'Failed to load application'))
      .finally(() => setLoading(false));
  }, [applicationId]);

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return 'Unknown date';
    return date.toISOString().slice(0, 10);
  };

  const handleStatusChange = async (status: Application['status']) => {
    if (!application) return;
    setSaving(true);
    try {
      await applicationsService.updateApplicationStatus(application._id, status);
      setApplication((prev) => (prev ? { ...prev, status } : prev));
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleMessage = async () => {
    const workerId = application?.workerId?._id;
    if (!workerId) return;
    setMessageLoading(true);
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
      setError(e?.response?.data?.message || 'Unable to start chat');
    } finally {
      setMessageLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!application) return;
    const confirmed = window.confirm('Delete this application? This cannot be undone.');
    if (!confirmed) return;
    setDeleteLoading(true);
    setError(null);
    try {
      await applicationsService.deleteApplication(application._id);
      router.push('/employer/applications');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Unable to delete application');
    } finally {
      setDeleteLoading(false);
    }
  };

  const resumeValue = application?.resume || '';
  const resumeIsLink = resumeValue.startsWith('http');

  return (
    <div className="page-container">
      <div className="applications-header">
        <div>
          <h1>Application</h1>
          <p className="muted">Review details and update the application status.</p>
        </div>
        <Link className="btn-secondary" href="/employer/applications">
          Back to applications
        </Link>
      </div>

      {error && <p className="error-message">{error}</p>}

      {loading || !application ? (
        <p className="loading">Loading application...</p>
      ) : (
        <div className="profile-grid">
          <section className="card">
            <h2>Job</h2>
            <div className="profile-list">
              <div>
                <span className="profile-label">Title</span>
                <div className="profile-value">
                  {application.jobId?.title || 'Role unavailable'}
                </div>
              </div>
              <div>
                <span className="profile-label">Company</span>
                <div className="profile-value">{application.jobId?.company || 'Company'}</div>
              </div>
              <div>
                <span className="profile-label">Location</span>
                <div className="profile-value">{application.jobId?.location || 'Location TBD'}</div>
              </div>
              <div>
                <span className="profile-label">Applied</span>
                <div className="profile-value">{formatDate(application.createdAt)}</div>
              </div>
              {application.jobId?._id && (
                <Link className="btn-ghost" href={`/job/${application.jobId._id}`}>
                  View job
                </Link>
              )}
            </div>
          </section>

          <section className="card">
            <h2>Applicant</h2>
            <div className="profile-list">
              <div>
                <span className="profile-label">Name</span>
                <div className="profile-value">{application.workerId?.name || 'Applicant'}</div>
              </div>
              <div>
                <span className="profile-label">Email</span>
                <div className="profile-value">
                  {application.workerId?.allowContact
                    ? application.workerId?.email
                      ? (
                          <a href={`mailto:${application.workerId.email}`}>
                            {application.workerId.email}
                          </a>
                        )
                      : 'No email'
                    : 'Contact locked'}
                </div>
              </div>
              {application.workerId?.allowContact && (
                <>
                  {application.workerId?.phone && (
                    <div>
                      <span className="profile-label">Phone</span>
                      <div className="profile-value">
                        <a href={`tel:${application.workerId.phone}`}>
                          {application.workerId.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  {(application.workerId?.chatApp || application.workerId?.chatHandle) && (
                    <div>
                      <span className="profile-label">Chat</span>
                      <div className="profile-value">
                        {application.workerId.chatApp || 'Chat'}{' '}
                        {application.workerId.chatHandle || ''}
                      </div>
                    </div>
                  )}
                </>
              )}
              {application.workerId?._id && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={handleMessage}
                  disabled={messageLoading}
                >
                  {messageLoading ? 'Opening...' : 'Message'}
                </button>
              )}
              {application.workerId?._id && (
                <Link className="btn-ghost" href={`/profile/${application.workerId._id}`}>
                  View profile
                </Link>
              )}
            </div>
          </section>

          <section className="card">
            <h2>Application</h2>
            <div className="profile-list">
              <div>
                <span className="profile-label">Status</span>
                <div className="profile-value">
                  <select
                    value={application.status}
                    onChange={(e) => handleStatusChange(e.target.value as Application['status'])}
                    disabled={saving}
                  >
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
              <div>
                <span className="profile-label">Cover letter</span>
                <div className="profile-value">
                  {application.coverLetter ? (
                    <p className="resume-text">{application.coverLetter}</p>
                  ) : (
                    <span className="muted">No cover letter submitted.</span>
                  )}
                </div>
              </div>
              <div>
                <span className="profile-label">Resume</span>
                <div className="profile-value">
                  {resumeValue ? (
                    resumeIsLink ? (
                      <a href={resumeValue} target="_blank" rel="noreferrer">
                        View resume
                      </a>
                    ) : (
                      <pre className="resume-text">{resumeValue}</pre>
                    )
                  ) : (
                    <span className="muted">No resume submitted.</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="btn-danger"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete application'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
