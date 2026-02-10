'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authService, usersService } from '@/services/api';
import { friendlyError } from '@/lib/feedback';

type Worker = {
  _id: string;
  name?: string;
  location?: string;
  headline?: string;
  summary?: string;
  skills?: string[];
  yearsExperience?: number;
  desiredRoles?: string[];
  availability?: string;
  profilePicture?: string;
};

export default function TalentPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    location: '',
    skill: '',
    availability: '',
    minExp: '',
    maxExp: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedWorkers, setSavedWorkers] = useState<string[]>([]);
  const [isEmployer, setIsEmployer] = useState(false);
  const [saveLoading, setSaveLoading] = useState<Record<string, boolean>>({});

  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const res = await usersService.searchWorkers({
        search: filters.search || undefined,
        location: filters.location || undefined,
        skill: filters.skill || undefined,
        availability: filters.availability || undefined,
        minExp: filters.minExp ? Number(filters.minExp) : undefined,
        maxExp: filters.maxExp ? Number(filters.maxExp) : undefined,
      });
      setWorkers(res.data || []);
      setError(null);
    } catch (e: any) {
      setError(friendlyError(e, 'We could not load talent. Please try again.'));
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let active = true;
    authService
      .me()
      .then((res) => {
        if (!active) return;
        const roles: string[] = Array.isArray(res.data?.roles) ? res.data.roles : [];
        setIsEmployer(roles.includes('employer'));
        setSavedWorkers(Array.isArray(res.data?.savedWorkers) ? res.data.savedWorkers : []);
      })
      .catch(() => {
        if (!active) return;
        setIsEmployer(false);
        setSavedWorkers([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWorkers();
  };

  const updateSavedWorkers = (workerId: string, add: boolean) => {
    setSavedWorkers((prev) => {
      if (add) {
        if (prev.includes(workerId)) return prev;
        return [...prev, workerId];
      }
      return prev.filter((id) => id !== workerId);
    });
  };

  const handleToggleSavedWorker = async (workerId: string, currentlySaved: boolean) => {
    if (!isEmployer) return;
    setSaveLoading((prev) => ({ ...prev, [workerId]: true }));
    try {
      if (currentlySaved) {
        await usersService.unsaveWorker(workerId);
        updateSavedWorkers(workerId, false);
      } else {
        await usersService.saveWorker(workerId);
        updateSavedWorkers(workerId, true);
      }
    } catch (err: any) {
      setError(friendlyError(err, 'We could not update your saved candidates.'));
    } finally {
      setSaveLoading((prev) => ({ ...prev, [workerId]: false }));
    }
  };

  return (
    <div className="page-container">
      <div className="talent-head">
        <div>
          <div className="eyebrow">Talent</div>
          <h1>Find workers ready for their next role.</h1>
          <p className="muted">
            Filter by skill, experience, and availability to discover great candidates.
          </p>
        </div>
      </div>

      <form className="filter-card talent-filters" onSubmit={handleSearch}>
        <input
          name="search"
          placeholder="Name, headline, or role"
          value={filters.search}
          onChange={handleChange}
        />
        <input
          name="location"
          placeholder="Location"
          value={filters.location}
          onChange={handleChange}
        />
        <input
          name="skill"
          placeholder="Skill (e.g. React)"
          value={filters.skill}
          onChange={handleChange}
        />
        <select name="availability" value={filters.availability} onChange={handleChange}>
          <option value="">Availability</option>
          <option value="open">Open to offers</option>
          <option value="immediately">Immediately</option>
          <option value="2-weeks">2 weeks</option>
          <option value="1-month">1 month</option>
        </select>
        <input
          name="minExp"
          type="number"
          placeholder="Min years"
          value={filters.minExp}
          onChange={handleChange}
        />
        <input
          name="maxExp"
          type="number"
          placeholder="Max years"
          value={filters.maxExp}
          onChange={handleChange}
        />
        <button type="submit" className="btn-primary">
          Search
        </button>
      </form>

      {error && <p className="error-message">{error}</p>}

      {loading ? (
        <p className="loading">Loading talent...</p>
      ) : workers.length === 0 ? (
        <div className="empty-state">
          <strong>No workers found.</strong>
          <p>Try adjusting your search terms or filters.</p>
        </div>
      ) : (
        <div className="talent-grid">
          {workers.map((worker) => (
            <div key={worker._id} className="talent-card">
              <div className="talent-card-head">
                <div className="talent-avatar">
                  {worker.profilePicture ? (
                    <img src={worker.profilePicture} alt={worker.name || 'Worker'} />
                  ) : (
                    <span>{worker.name ? worker.name.slice(0, 2).toUpperCase() : 'WP'}</span>
                  )}
                </div>
                <div className="talent-card-head-body">
                  <h3>{worker.name || 'Unnamed worker'}</h3>
                  <p className="muted">
                    {worker.headline || 'Professional available for opportunities'}
                  </p>
                </div>
                {isEmployer && (
                  <button
                    type="button"
                    className={`talent-save-button ${savedWorkers.includes(worker._id) ? 'saved' : ''}`}
                    onClick={() =>
                      handleToggleSavedWorker(worker._id, savedWorkers.includes(worker._id))
                    }
                    disabled={Boolean(saveLoading[worker._id])}
                    aria-pressed={savedWorkers.includes(worker._id)}
                    title={
                      savedWorkers.includes(worker._id)
                        ? 'Remove saved candidate'
                        : 'Save candidate'
                    }
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M12 4.5a2 2 0 0 0-2 2v10.585l-3.293-3.293a1 1 0 0 0-1.414 1.414l5 5a1 1 0 0 0 1.414 0l5-5a1 1 0 0 0-1.414-1.414L14 17.085V6.5a2 2 0 0 0-2-2z"
                        fill="currentColor"
                      />
                    </svg>
                    <span>{savedWorkers.includes(worker._id) ? 'Saved' : 'Save'}</span>
                  </button>
                )}
              </div>
              <div className="talent-meta">
                <span>{worker.location || 'Location flexible'}</span>
                <span className="dot">|</span>
                <span>
                  {worker.yearsExperience ? `${worker.yearsExperience}+ yrs` : 'Experience varies'}
                </span>
                <span className="dot">|</span>
                <span>{worker.availability || 'Open'}</span>
              </div>
              {worker.summary && <p className="job-desc">{worker.summary.slice(0, 160)}...</p>}
              {worker.skills && worker.skills.length > 0 && (
                <div className="job-tags">
                  {worker.skills.slice(0, 6).map((skill) => (
                    <span key={skill} className="pill">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
              <div className="application-actions">
                <Link href={`/profile/${worker._id}`}>View profile</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
