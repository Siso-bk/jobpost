'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminService, jobsService } from '@/services/api';
import { friendlyError } from '@/lib/feedback';

type JobItem = {
  _id: string;
  title: string;
  company: string;
  location: string;
  status: 'open' | 'closed';
  isHidden?: boolean;
  createdAt: string;
  employerId?: { name?: string; email?: string; companyName?: string } | null;
};

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [filters, setFilters] = useState({ status: 'all', hidden: 'all', search: '' });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchJobs = async (nextPage = page, nextFilters = filters) => {
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await adminService.listJobs({
        ...nextFilters,
        page: nextPage,
        limit: 20
      });
      const data = res.data?.items ? res.data : { items: res.data, pages: 1 };
      setJobs(data.items || []);
      setPages(data.pages || 1);
    } catch (err: any) {
      setError(friendlyError(err, 'We could not load jobs. Please try again.'));
      setJobs([]);
      setPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs(page, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    fetchJobs(1, filters);
  };

  const handleToggleVisibility = async (job: JobItem) => {
    setActionLoadingId(job._id);
    setError(null);
    setStatusMessage(null);
    try {
      const res = job.isHidden
        ? await jobsService.unhideJob(job._id)
        : await jobsService.hideJob(job._id);
      const updated = res.data?.job || { ...job, isHidden: !job.isHidden };
      setJobs((prev) =>
        prev.map((item) => (item._id === job._id ? { ...item, ...updated } : item))
      );
      setStatusMessage(job.isHidden ? 'Job unhidden.' : 'Job hidden.');
    } catch (err: any) {
      setError(friendlyError(err, 'We could not update visibility. Please try again.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return 'Unknown date';
    return date.toISOString().slice(0, 10);
  };

  return (
    <div className="page-container">
      <div className="applications-header">
        <div>
          <div className="eyebrow">Admin</div>
          <h1>Job moderation</h1>
          <p className="muted">Hide or restore job listings across the platform.</p>
        </div>
        <div className="panel-actions">
          <Link className="btn-ghost" href="/admin">
            Home editor
          </Link>
          <Link className="btn-ghost" href="/moderation">
            Moderation
          </Link>
        </div>
      </div>

      <form className="panel-actions" onSubmit={handleSearch} style={{ marginBottom: 16 }}>
        <input
          name="search"
          placeholder="Search title, company, location"
          value={filters.search}
          onChange={handleFilterChange}
        />
        <select name="status" value={filters.status} onChange={handleFilterChange}>
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
        <select name="hidden" value={filters.hidden} onChange={handleFilterChange}>
          <option value="all">All visibility</option>
          <option value="false">Visible</option>
          <option value="true">Hidden</option>
        </select>
        <button type="submit" className="btn-secondary" disabled={loading}>
          {loading ? 'Filtering...' : 'Filter'}
        </button>
      </form>

      {statusMessage && <p className="status-message">{statusMessage}</p>}
      {error && <p className="error-message">{error}</p>}

      {loading ? (
        <p className="loading">Loading jobs...</p>
      ) : jobs.length === 0 ? (
        <div className="empty-state">
          <strong>No jobs found.</strong>
          <p>Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="applications-grid">
          {jobs.map((job) => (
            <div key={job._id} className="application-card">
              <div className="application-head">
                <div>
                  <h3>{job.title}</h3>
                  <p className="muted">{job.company}</p>
                </div>
                <span className={`status-pill status-${job.isHidden ? 'hidden' : job.status}`}>
                  {job.isHidden ? 'hidden' : job.status}
                </span>
              </div>
              <div className="application-meta">
                <span>{job.location}</span>
                <span className="dot">|</span>
                <span>Posted {formatDate(job.createdAt)}</span>
                {job.employerId?.name && (
                  <>
                    <span className="dot">|</span>
                    <span>By {job.employerId.name}</span>
                  </>
                )}
              </div>
              <div className="application-actions">
                <Link href={`/job/${job._id}`}>View</Link>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => handleToggleVisibility(job)}
                  disabled={actionLoadingId === job._id}
                >
                  {actionLoadingId === job._id
                    ? 'Updating...'
                    : job.isHidden
                    ? 'Unhide'
                    : 'Hide'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="pagination">
          <button
            className="btn-ghost"
            disabled={page === 1}
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          >
            Prev
          </button>
          <span className="muted">
            Page {page} of {pages}
          </span>
          <button
            className="btn-ghost"
            disabled={page >= pages}
            onClick={() => setPage((prev) => Math.min(prev + 1, pages))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
