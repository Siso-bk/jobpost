'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { authService, jobsService, usersService } from '@/services/api';
import { friendlyError } from '@/lib/feedback';

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
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [isWorker, setIsWorker] = useState(false);
  const [saveLoading, setSaveLoading] = useState<Record<string, boolean>>({});
  const skeletons = Array.from({ length: 6 }, (_, index) => index);

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    let active = true;
    authService
      .me()
      .then((res) => {
        if (!active) return;
        const roles: string[] = Array.isArray(res.data?.roles) ? res.data.roles : [];
        setIsWorker(roles.includes('worker'));
        setSavedJobs(Array.isArray(res.data?.savedJobs) ? res.data.savedJobs : []);
      })
      .catch(() => {
        if (!active) return;
        setIsWorker(false);
        setSavedJobs([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await jobsService.getAllJobs({ ...filters, page, limit: 12 });
      const data = res.data?.items ? res.data : { items: res.data, pages: 1 };
      setJobs(data.items);
      setPages(data.pages || 1);
      setError(null);
    } catch (e: any) {
      setError(friendlyError(e, 'We could not load jobs. Please try again.'));
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

  const updateSavedJobs = (jobId: string, add: boolean) => {
    setSavedJobs((prev) => {
      if (add) {
        if (prev.includes(jobId)) return prev;
        return [...prev, jobId];
      }
      return prev.filter((id) => id !== jobId);
    });
  };

  const handleToggleSaveJob = async (jobId: string, currentlySaved: boolean) => {
    if (!isWorker) return;
    setSaveLoading((prev) => ({ ...prev, [jobId]: true }));
    try {
      if (currentlySaved) {
        await usersService.unsaveJob(jobId);
        updateSavedJobs(jobId, false);
      } else {
        await usersService.saveJob(jobId);
        updateSavedJobs(jobId, true);
      }
    } catch (err: any) {
      setError(friendlyError(err, 'We could not update your saved jobs.'));
    } finally {
      setSaveLoading((prev) => ({ ...prev, [jobId]: false }));
    }
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
              const jobLabel = `View ${job.title} at ${job.company}`;
              return (
                <Link
                  key={job._id}
                  href={`/job/${job._id}`}
                  className="job-card job-card-link"
                  aria-label={jobLabel}
                >
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
                    {isWorker && (
                      <button
                        type="button"
                        className={`job-save-button ${savedJobs.includes(job._id) ? 'saved' : ''}`}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleToggleSaveJob(job._id, savedJobs.includes(job._id));
                        }}
                        disabled={Boolean(saveLoading[job._id])}
                        aria-pressed={savedJobs.includes(job._id)}
                        title={savedJobs.includes(job._id) ? 'Remove saved job' : 'Save job'}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M6 4h12v16l-6-4-6 4z" fill="currentColor" />
                        </svg>
                        <span>{savedJobs.includes(job._id) ? 'Saved' : 'Save'}</span>
                      </button>
                    )}
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
                    <span className="job-link">View details</span>
                  </div>
                </Link>
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
