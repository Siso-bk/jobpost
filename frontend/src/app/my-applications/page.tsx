'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { applicationsService } from '@/services/api';
import { friendlyError } from '@/lib/feedback';
import { formatSalary, Salary } from '@/lib/salary';

type Job = {
  _id: string;
  title: string;
  company: string;
  location: string;
  jobType: string;
  salary?: Salary;
};

type Employer = {
  name?: string;
  company?: string;
};

type Application = {
  _id: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  createdAt: string;
  coverLetter?: string;
  jobId?: Job | null;
  employerId?: Employer | null;
};

export default function MyApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true);
      try {
        const res = await applicationsService.getMyApplications();
        setApplications(res.data || []);
        setError(null);
      } catch (e: any) {
        setError(friendlyError(e, 'We could not load applications. Please try again.'));
        setApplications([]);
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, []);

  const formatStatus = (value: string) => value.replace(/\b\w/g, (char) => char.toUpperCase());

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return 'Unknown date';
    return date.toISOString().slice(0, 10);
  };

  return (
    <div className="applications-page">
      <section className="page-container">
        <div className="applications-header">
          <div>
            <h1>My applications</h1>
            <p className="muted">Track the roles you have applied for and their latest status.</p>
          </div>
          <Link className="btn-secondary" href="/jobs">
            Browse jobs
          </Link>
        </div>

        {error && <p className="error-message">{error}</p>}

        {loading ? (
          <p className="loading">Loading applications...</p>
        ) : applications.length === 0 ? (
          <div className="empty-state">
            <strong>No applications yet.</strong>
            <p>Apply to your first role to see it here.</p>
          </div>
        ) : (
          <div className="applications-grid">
            {applications.map((application) => {
              const job = application.jobId;
              const salaryText = job?.salary ? formatSalary(job.salary) : "";
              return (
                <div key={application._id} className="application-card">
                  <div className="application-head">
                    <div>
                      <h3>{job?.title || 'Role unavailable'}</h3>
                      <p className="muted">
                        {job?.company || application.employerId?.company || 'Company'}
                      </p>
                    </div>
                    <span className={`status-pill status-${application.status}`}>
                      {formatStatus(application.status)}
                    </span>
                  </div>
                  <div className="application-meta">
                    <span>{job?.location || 'Location TBD'}</span>
                    <span className="dot">|</span>
                    <span>
                      {job?.jobType ? formatStatus(job.jobType.replace('-', ' ')) : 'Role type'}
                    </span>
                    <span className="dot">|</span>
                    <span>Applied {formatDate(application.createdAt)}</span>
                  </div>
                  {salaryText && (
                    <div className="job-tags">
                      <span className="pill">{salaryText}</span>
                    </div>
                  )}
                  <div className="application-actions">
                    {job?._id ? (
                      <Link href={`/job/${job._id}`}>View job</Link>
                    ) : (
                      <span className="muted">Job no longer available</span>
                    )}
                    <Link href={`/my-applications/${application._id}`}>View application</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}


