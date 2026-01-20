"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { applicationsService } from '@/services/api';

type Job = {
  _id: string;
  title: string;
  company: string;
  location: string;
  jobType?: string;
};

type Employer = {
  _id: string;
  name?: string;
  email?: string;
  company?: string;
};

type Application = {
  _id: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  createdAt: string;
  coverLetter?: string;
  resume?: string;
  jobId?: Job | null;
  employerId?: Employer | null;
};

export default function WorkerApplicationDetailPage() {
  const params = useParams();
  const applicationId = (params?.id as string) || '';
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const resumeValue = application?.resume || '';
  const resumeIsLink = resumeValue.startsWith('http');

  return (
    <div className="page-container">
      <div className="applications-header">
        <div>
          <h1>Application</h1>
          <p className="muted">Review what you submitted and track the status.</p>
        </div>
        <Link className="btn-secondary" href="/my-applications">Back to applications</Link>
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
                <div className="profile-value">{application.jobId?.title || 'Role unavailable'}</div>
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
                <Link className="btn-ghost" href={`/job/${application.jobId._id}`}>View job</Link>
              )}
            </div>
          </section>

          <section className="card">
            <h2>Employer</h2>
            <div className="profile-list">
              <div>
                <span className="profile-label">Name</span>
                <div className="profile-value">{application.employerId?.name || 'Employer'}</div>
              </div>
              <div>
                <span className="profile-label">Company</span>
                <div className="profile-value">{application.employerId?.company || 'Company'}</div>
              </div>
            </div>
          </section>

          <section className="card">
            <h2>Application</h2>
            <div className="profile-list">
              <div>
                <span className="profile-label">Status</span>
                <div className="profile-value">{application.status}</div>
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
                      <a href={resumeValue} target="_blank" rel="noreferrer">View resume</a>
                    ) : (
                      <pre className="resume-text">{resumeValue}</pre>
                    )
                  ) : (
                    <span className="muted">No resume submitted.</span>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
