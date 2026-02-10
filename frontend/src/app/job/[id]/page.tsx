import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import ApplyForm from '@/components/ApplyForm';
import JobImageGallery from '@/components/JobImageGallery';
import { formatSalary } from '@/lib/salary';

async function getJob(id: string) {
  // Next.js server components should use fetch directly.
  const base =
    process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_ORIGIN || ''}/api` || '/api';
  const cookieHeader = cookies().toString();
  const headers = cookieHeader ? { cookie: cookieHeader } : undefined;
  const res = await fetch(`${base}/jobs/${id}`, { cache: 'no-store', headers });
  if (!res.ok) throw new Error('Failed to fetch job');
  return res.json();
}

const normalizeExternalUrl = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return '';
  return `https://${trimmed}`;
};

const displayUrl = (value?: string) => {
  const normalized = normalizeExternalUrl(value);
  if (!normalized) return '';
  try {
    const url = new URL(normalized);
    const host = url.hostname.replace(/^www\./i, '');
    const path = url.pathname && url.pathname !== '/' ? url.pathname : '';
    return `${host}${path}`;
  } catch {
    return normalized.replace(/^https?:\/\//i, '');
  }
};

const buildApplyLink = (jobId: string) => {
  const base = process.env.NEXT_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || '';
  const path = `/job/${jobId}#apply`;
  if (!base) return path;
  return `${base.replace(/\/$/, '')}${path}`;
};

export default async function JobDetail({ params }: { params: { id: string } }) {
  const job = await getJob(params.id);
  const internalApplyLink = buildApplyLink(job._id);
  const externalApplyLink = normalizeExternalUrl(job.applyLink);
  const externalApplyLabel = displayUrl(job.applyLink) || externalApplyLink;
  const companyLink = normalizeExternalUrl(job.companyLink);
  const companyLabel = displayUrl(job.companyLink) || companyLink;
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
            <div className="job-meta">{formatSalary(job.salary)}</div>
          </div>
        )}
        {Array.isArray(job.imageUrls) && job.imageUrls.length > 0 && (
          <div className="detail-card">
            <strong>Images</strong>
            <JobImageGallery images={job.imageUrls} />
          </div>
        )}
                <div className="detail-card">
          <strong>Links</strong>
          <div className="job-links">
            {externalApplyLink ? (
              <a
                className="job-link job-link-primary"
                href={externalApplyLink}
                target="_blank"
                rel="noreferrer"
              >
                <span className="job-link-label">Apply on company site</span>
                <span className="job-link-meta">{externalApplyLabel}</span>
              </a>
            ) : (
              <a className="job-link" href={internalApplyLink}>
                <span className="job-link-label">Apply on JobPost</span>
                <span className="job-link-meta">{internalApplyLink}</span>
              </a>
            )}
            {companyLink && (
              <a className="job-link" href={companyLink} target="_blank" rel="noreferrer">
                <span className="job-link-label">Company link</span>
                <span className="job-link-meta">{companyLabel}</span>
              </a>
            )}
          </div>
        </div>
        <div className="detail-card">
          <strong>Description</strong>
          <p className="job-desc" style={{ whiteSpace: 'pre-wrap' }}>
            {job.description}
          </p>
        </div>
        {!externalApplyLink && <ApplyForm jobId={job._id} />}
      </div>
    </div>
  );
}


