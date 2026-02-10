'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { authService, jobsService, usersService } from '@/services/api';
import { friendlyError } from '@/lib/feedback';
import { formatSalary, Salary } from '@/lib/salary';

type Job = {
  _id: string;
  title: string;
  description: string;
  company: string;
  location: string;
  jobType: string;
  salary?: Salary;
  views?: number;
  logoUrl?: string;
};
type SuggestionPayload = {
  filters: Partial<{ title: string; location: string; jobType: string }>;
  reasons?: string[];
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filters, setFilters] = useState({ title: '', location: '', jobType: '' });
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [isWorker, setIsWorker] = useState(false);
  const [saveLoading, setSaveLoading] = useState<Record<string, boolean>>({});
  const [suggestions, setSuggestions] = useState<SuggestionPayload | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [shareNote, setShareNote] = useState<{ tone: 'success' | 'fail'; message: string } | null>(
    null
  );
  const [initReady, setInitReady] = useState(false);
  const shareTimeoutRef = useRef<number | null>(null);
  const skeletons = Array.from({ length: 6 }, (_, index) => index);

  const normalizeLocationOptions = (values: string[]) => {
    const cleaned = values.map((value) => value.trim()).filter(Boolean);
    const unique = Array.from(new Set(cleaned));
    unique.sort((a, b) => {
      const aRemote = /remote/i.test(a);
      const bRemote = /remote/i.test(b);
      if (aRemote && !bRemote) return -1;
      if (!aRemote && bRemote) return 1;
      return a.localeCompare(b);
    });
    if (!unique.some((value) => /remote/i.test(value))) {
      unique.unshift('Remote');
    }
    return unique;
  };

  useEffect(() => {
    if (!initReady) return;
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, initReady]);

  useEffect(() => {
    let active = true;
    jobsService
      .listLocations()
      .then((res: any) => {
        if (!active) return;
        const items = Array.isArray(res.data?.items)
          ? res.data.items
          : Array.isArray(res.data)
            ? res.data
            : [];
        setLocationOptions(normalizeLocationOptions(items));
      })
      .catch(() => {
        if (!active) return;
        setLocationOptions(['Remote']);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const detectLocation = async () => {
      try {
        const res = await fetch('https://ipwho.is/', { signal: controller.signal });
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        const city = typeof data?.city === 'string' ? data.city.trim() : '';
        const country = typeof data?.country === 'string' ? data.country.trim() : '';
        const locationValue = city && country ? `${city}, ${country}` : city || country;
        if (locationValue) {
          setFilters((prev) => {
            if (prev.location || prev.title || prev.jobType) return prev;
            return { ...prev, location: locationValue };
          });
        }
      } catch (error) {
        // Ignore location lookup errors.
      } finally {
        if (active) setInitReady(true);
      }
    };

    detectLocation();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

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

  useEffect(() => {
    return () => {
      if (shareTimeoutRef.current) {
        window.clearTimeout(shareTimeoutRef.current);
      }
    };
  }, []);

  const flashShareNote = (tone: 'success' | 'fail', message: string) => {
    setShareNote({ tone, message });
    if (shareTimeoutRef.current) {
      window.clearTimeout(shareTimeoutRef.current);
    }
    shareTimeoutRef.current = window.setTimeout(() => {
      setShareNote(null);
    }, 3000);
  };

  const fetchJobs = async (overrideFilters = filters, overridePage = page) => {
    setLoading(true);
    try {
      const res = (await jobsService.getAllJobs({
        ...overrideFilters,
        page: overridePage,
        limit: 12,
      })) as any;
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
    setSuggestions(null);
    setPage(1);
    fetchJobs(filters, 1);
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

  const handleSuggestions = async () => {
    setSuggesting(true);
    setError(null);
    try {
      const res = await fetch('/api/paichat/suggestions', { credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 401) {
          throw new Error('Sign in to get personalized suggestions.');
        }
        throw new Error(data?.message || 'We could not load personalized suggestions.');
      }
      const data = await res.json();
      const nextFilters = {
        title: data?.filters?.title || '',
        location: data?.filters?.location || '',
        jobType: data?.filters?.jobType || '',
      };
      setFilters(nextFilters);
      setSuggestions({ filters: nextFilters, reasons: data?.reasons || [] });
      setPage(1);
      await fetchJobs(nextFilters, 1);
    } catch (err: any) {
      setError(friendlyError(err, err?.message || 'We could not load suggestions.'));
    } finally {
      setSuggesting(false);
    }
  };

  const clearSuggestions = () => {
    const cleared = { title: '', location: '', jobType: '' };
    setFilters(cleared);
    setSuggestions(null);
    setPage(1);
    fetchJobs(cleared, 1);
  };

  const locationChoices = React.useMemo(() => {
    const base = normalizeLocationOptions(locationOptions);
    if (!filters.location || base.includes(filters.location)) {
      return base;
    }
    if (base.length && /remote/i.test(base[0])) {
      return [base[0], filters.location, ...base.slice(1)];
    }
    return [filters.location, ...base];
  }, [filters.location, locationOptions]);

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
  const buildShareLink = (jobId: string) => {
    const base =
      process.env.NEXT_PUBLIC_ORIGIN ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    const path = `/job/${jobId}#apply`;
    if (!base) return path;
    return `${base.replace(/\/$/, '')}${path}`;
  };

  const handleShareJob = async (event: React.MouseEvent<HTMLButtonElement>, job: Job) => {
    event.preventDefault();
    event.stopPropagation();
    const link = buildShareLink(job._id);
    const title = `${job.title} at ${job.company}`;
    const text = `Apply for ${job.title} at ${job.company}`;

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: link });
        flashShareNote('success', 'Share sheet opened.');
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        flashShareNote('success', 'Link copied.');
        return;
      }
      window.prompt('Copy this link', link);
      flashShareNote('success', 'Link ready to copy.');
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      flashShareNote('fail', 'Could not share the link.');
    }
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
            <select name="location" value={filters.location} onChange={handleChange}>
              <option value="">All locations</option>
              {locationChoices.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
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
          <div>
            <h2>{suggestions ? 'Recommended for you' : 'Latest roles'}</h2>
            {suggestions?.reasons?.length ? (
              <div className="suggestions-reasons">
                {suggestions.reasons.map((reason) => (
                  <span key={reason} className="suggestion-chip">
                    {reason}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="results-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleSuggestions}
              disabled={suggesting}
            >
              {suggesting ? 'Personalizing...' : 'Suggestions'}
            </button>
            {suggestions ? (
              <button type="button" className="btn-ghost" onClick={clearSuggestions}>
                Reset
              </button>
            ) : null}
            <span className="muted">{loading ? 'Loading roles...' : `${jobs.length} roles`}</span>
          </div>
        </div>

        {error && (
          <p className="error-message" style={{ textAlign: 'center' }}>
            {error}
          </p>
        )}
        {shareNote && (
          <p className={`status-message status-${shareNote.tone}`} style={{ textAlign: 'center' }}>
            {shareNote.message}
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
              const isSaved = savedJobs.includes(job._id);
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
                    <div className="job-card-actions">
                      <button
                        type="button"
                        className="job-share-button"
                        onClick={(event) => handleShareJob(event, job)}
                        title="Share job"
                        aria-label="Share job"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            d="M12 3l4 4h-3v6h-2V7H8l4-4zm-6 8v8h12v-8h2v10H4V11h2z"
                            fill="currentColor"
                          />
                        </svg>
                      </button>
                      {isWorker && (
                        <button
                          type="button"
                          className={`job-save-button ${isSaved ? 'saved' : ''}`}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handleToggleSaveJob(job._id, isSaved);
                          }}
                          disabled={Boolean(saveLoading[job._id])}
                          aria-pressed={isSaved}
                          title={isSaved ? 'Remove saved job' : 'Save job'}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M6 4h12v16l-6-4-6 4z" fill="currentColor" />
                          </svg>
                          <span>{isSaved ? 'Saved' : 'Save'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="job-tags">
                    <span className="pill">{formatJobType(job.jobType)}</span>
                    {job.salary && <span className="pill">{formatSalary(job.salary)}</span>}
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
