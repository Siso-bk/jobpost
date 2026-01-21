'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { jobsService } from '@/services/api';

type Job = {
  _id: string;
  title: string;
  description: string;
  company: string;
  location: string;
  jobType: string;
  salary?: { min: number; max: number; currency: string };
  views?: number;
  logoUrl?: string;
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filters, setFilters] = useState({ title: '', location: '', jobType: '' });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const skeletons = Array.from({ length: 6 }, (_, index) => index);

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await jobsService.getAllJobs({ ...filters, page, limit: 12 });
      const data = res.data?.items ? res.data : { items: res.data, pages: 1 };
      setJobs(data.items);
      setPages(data.pages || 1);
      setError(null);
    } catch (e: any) {
      const message = e?.response?.data?.message || e?.message || 'Failed to load jobs';
      setError(message);
      setJobs([]);
      setPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    setFilters((f) => ({ ...f, [name]: value }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs();
  };

  const getInitials = (company: string) => {
    const parts = company.trim().split(/\s+/).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase()).join('') || 'JP';
  };

  const getLogoColor = (company: string) => {
    let hash = 0;
    for (let i = 0; i < company.length; i += 1) {
      hash = (hash * 31 + company.charCodeAt(i)) % 360;
    }
    return `hsl(${hash}, 58%, 52%)`;
  };

  const formatJobType = (value: string) =>
    value.replace('-', ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  const isFeaturedJob = (job: Job, index: number) => {
    if (typeof job.views === 'number') {
      return job.views >= 50;
    }
    return index < 2;
  };

  return (
    <div className="jobs-page">
      <section className="jobs-hero">
        <div className="container">
          <div className="eyebrow">JobPost</div>
          <h1>Find work that fits your life.</h1>
          <p>
            Curated roles across remote, hybrid, and on-site teams. Search by title, location, and
            job type.
          </p>
          <form className="filter-card" onSubmit={handleSearch}>
            <input
              name="title"
              placeholder="Role or keyword"
              value={filters.title}
              onChange={handleChange}
            />
            <input
              name="location"
              placeholder="City, state, or remote"
              value={filters.location}
              onChange={handleChange}
            />
            <select name="jobType" value={filters.jobType} onChange={handleChange}>
              <option value="">All Job Types</option>
              <option value="full-time">Full Time</option>
              <option value="part-time">Part Time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
            <button type="submit" className="btn-primary">
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="page-container">
        <div className="results-head">
          <h2>Latest roles</h2>
          <span className="muted">{loading ? 'Loading roles...' : `${jobs.length} roles`}</span>
        </div>

        {error && (
          <p className="error-message" style={{ textAlign: 'center' }}>
            {error}
          </p>
        )}

        {loading ? (
          <div className="jobs-grid">
            {skeletons.map((index) => (
              <div key={`skeleton-${index}`} className="job-card skeleton-card">
                <div className="job-card-top">
                  <div className="skeleton skeleton-logo" />
                  <div className="skeleton-block">
                    <div className="skeleton skeleton-line" />
                    <div className="skeleton skeleton-line short" />
                  </div>
                </div>
                <div className="skeleton-group">
                  <div className="skeleton skeleton-pill" />
                  <div className="skeleton skeleton-pill wide" />
                </div>
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line" />
                <div className="job-actions">
                  <span className="skeleton skeleton-line short" />
                  <span className="skeleton skeleton-line short" />
                </div>
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="empty-state">
            <strong>No jobs found.</strong>
            <p>Try adjusting filters or search again.</p>
          </div>
        ) : (
          <div className="jobs-grid">
            {jobs.map((job, index) => {
              const featured = isFeaturedJob(job, index);
              const logoColor = getLogoColor(job.company);
              const initials = getInitials(job.company);
              return (
                <div key={job._id} className="job-card">
                  <div className="job-card-top">
                    <div className="job-logo" style={{ backgroundColor: logoColor }}>
                      {job.logoUrl ? (
                        <img src={job.logoUrl} alt={`${job.company} logo`} />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                    <div className="job-card-head">
                      <div className="job-title-row">
                        <h3 className="job-title">{job.title}</h3>
                        {featured && <span className="badge badge-featured">Featured</span>}
                      </div>
                      <div className="job-meta">
                        <span>{job.company}</span>
                        <span className="dot">|</span>
                        <span>{job.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="job-tags">
                    <span className="pill">{formatJobType(job.jobType)}</span>
                    {job.salary && (
                      <span className="pill">
                        ${job.salary.min} - ${job.salary.max} {job.salary.currency}
                      </span>
                    )}
                  </div>
                  <p className="job-desc">{job.description?.slice(0, 140)}...</p>
                  <div className="job-actions">
                    <span className="muted">Open role</span>
                    <Link href={`/job/${job._id}`}>View details</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pages > 1 && (
          <div className="pagination">
            <button
              className="btn-ghost"
              disabled={page === 1}
              onClick={() => {
                const next = Math.max(page - 1, 1);
                setPage(next);
              }}
            >
              Prev
            </button>
            <span className="muted">
              Page {page} of {pages}
            </span>
            <button
              className="btn-ghost"
              disabled={page >= pages}
              onClick={() => {
                const next = Math.min(page + 1, pages);
                setPage(next);
              }}
            >
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
