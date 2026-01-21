import React from 'react';
import Link from 'next/link';
import ApplyForm from '@/components/ApplyForm';

async function getJob(id: string) {
  // Next.js can't use axios instance with localStorage on server; fetch directly
  const base =
    process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_ORIGIN || ''}/api` || '/api';
  const res = await fetch(`${base}/jobs/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch job');
  return res.json();
}

export default async function JobDetail({ params }: { params: { id: string } }) {
  const job = await getJob(params.id);
  return (
    <div className="job-detail">
      <div className="detail-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div className="eyebrow">Job Details</div>
          <Link href="/jobs" className="btn-ghost">
            Back to jobs
          </Link>
        </div>
        <h1>{job.title}</h1>
        <div className="job-meta">
          <span>{job.company}</span>
          <span>|</span>
          <span>{job.location}</span>
          <span>|</span>
          <span className="pill">{job.jobType}</span>
        </div>
      </div>

      <div className="detail-grid">
        {job.salary && (
          <div className="detail-card">
            <strong>Salary</strong>
            <div className="job-meta">
              ${job.salary.min} - ${job.salary.max} {job.salary.currency}
            </div>
          </div>
        )}
        <div className="detail-card">
          <strong>Description</strong>
          <p className="job-desc" style={{ whiteSpace: 'pre-wrap' }}>
            {job.description}
          </p>
        </div>
        <ApplyForm jobId={job._id} />
      </div>
    </div>
  );
}
