'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authService, usersService } from '@/services/api';

type UserProfile = {
  name?: string;
  email?: string;
  role?: string;
  location?: string;
  bio?: string;
  phone?: string;
  profilePicture?: string;
  companyName?: string;
  companyWebsite?: string;
  companyDescription?: string;
  companyLogo?: string;
  headline?: string;
  summary?: string;
  skills?: string[] | string;
  yearsExperience?: number | string;
  desiredRoles?: string[] | string;
  availability?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  isDiscoverable?: boolean;
  allowContact?: boolean;
  chatApp?: string;
  chatHandle?: string;
  resumeUrl?: string;
};

export default function ProfilePage() {
  const params = useParams();
  const userId = (params?.id as string) || '';
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<UserProfile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [themeReady, setThemeReady] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const companyLogoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;
    authService
      .me()
      .then((res) => {
        if (!active) return;
        setViewerId(res.data?.id || null);
        setViewerRole(res.data?.role || null);
      })
      .catch(() => {
        if (!active) return;
        setViewerId(null);
        setViewerRole(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    usersService
      .getUserProfile(userId)
      .then((res) => {
        setUser(res.data);
        setForm({
          name: res.data?.name || '',
          location: res.data?.location || '',
          bio: res.data?.bio || '',
          phone: res.data?.phone || '',
          profilePicture: res.data?.profilePicture || '',
          companyName: res.data?.companyName || '',
          companyWebsite: res.data?.companyWebsite || '',
          companyDescription: res.data?.companyDescription || '',
          companyLogo: res.data?.companyLogo || '',
          headline: res.data?.headline || '',
          summary: res.data?.summary || '',
          skills: Array.isArray(res.data?.skills) ? res.data.skills : [],
          desiredRoles: Array.isArray(res.data?.desiredRoles) ? res.data.desiredRoles : [],
          yearsExperience: res.data?.yearsExperience,
          availability: res.data?.availability || 'open',
          portfolioUrl: res.data?.portfolioUrl || '',
          linkedinUrl: res.data?.linkedinUrl || '',
          githubUrl: res.data?.githubUrl || '',
          isDiscoverable: res.data?.isDiscoverable !== false,
          allowContact: res.data?.allowContact === true,
          chatApp: res.data?.chatApp || '',
          chatHandle: res.data?.chatHandle || '',
          resumeUrl: res.data?.resumeUrl || '',
        });
      })
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
      if (stored === 'light' || stored === 'dark') {
        setTheme(stored);
        document.documentElement.dataset.theme = stored;
        setThemeReady(true);
        return;
      }
    } catch {}
    if (typeof document !== 'undefined') {
      const current = document.documentElement.dataset.theme;
      if (current === 'light' || current === 'dark') {
        setTheme(current);
      }
    }
    setThemeReady(true);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try {
      localStorage.setItem('theme', next);
    } catch {}
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = next;
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    setError(null);
    try {
      await authService.logout();
      router.replace('/login');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Logout failed');
      setLogoutLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    const maxSize = 700 * 1024;
    if (file.size > maxSize) {
      setError('Image must be under 700KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, profilePicture: reader.result as string }));
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setForm((prev) => ({ ...prev, profilePicture: '' }));
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  const handleCompanyLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    const maxSize = 700 * 1024;
    if (file.size > maxSize) {
      setError('Image must be under 700KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, companyLogo: reader.result as string }));
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCompanyLogo = () => {
    setForm((prev) => ({ ...prev, companyLogo: '' }));
    if (companyLogoInputRef.current) {
      companyLogoInputRef.current.value = '';
    }
  };

  const parseList = (value?: string | string[]) => {
    if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
    return String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const formatList = (value?: string | string[]) => {
    const items = parseList(value);
    return items.length > 0 ? items.join(', ') : '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload = {
        ...form,
        skills: parseList(form.skills),
        desiredRoles: parseList(form.desiredRoles),
        yearsExperience:
          form.yearsExperience !== undefined &&
          form.yearsExperience !== null &&
          form.yearsExperience !== ''
            ? Number(form.yearsExperience)
            : undefined,
      };
      const res = await usersService.updateProfile(userId, payload);
      setUser(res.data?.user || null);
      setMessage('Profile updated successfully');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const isOwner = Boolean(viewerId && viewerId === userId);
  const roleForView = user?.role || viewerRole;
  const isEmployer = roleForView === 'employer';
  const isWorker = roleForView === 'worker';
  const themeLabel = themeReady
    ? theme === 'light'
      ? 'Switch to dark'
      : 'Switch to light'
    : 'Theme';

  return (
    <div className="page-container profile-page">
      <div className="profile-grid">
        <section className="card">
          <h1>Profile</h1>
          {loading && <p>Loading profile...</p>}
          {error && <p className="error-message">{error}</p>}
          {!loading && user && (
            <div className="profile-list">
              {user.profilePicture && (
                <div className="profile-avatar-wrap">
                  <img
                    className="profile-avatar"
                    src={user.profilePicture}
                    alt={user.name || 'Profile'}
                  />
                </div>
              )}
              <div>
                <span className="profile-label">Name</span>
                <div className="profile-value">{user.name || 'N/A'}</div>
              </div>
              {isOwner && (
                <div>
                  <span className="profile-label">Email</span>
                  <div className="profile-value">{user.email || 'N/A'}</div>
                </div>
              )}
              <div>
                <span className="profile-label">Role</span>
                <div className="profile-value tag">{user.role || 'N/A'}</div>
              </div>
              {user.location && (
                <div>
                  <span className="profile-label">Location</span>
                  <div className="profile-value">{user.location}</div>
                </div>
              )}
              {user.bio && (
                <div>
                  <span className="profile-label">Bio</span>
                  <div className="profile-value">{user.bio}</div>
                </div>
              )}
              {isWorker && user.headline && (
                <div>
                  <span className="profile-label">Headline</span>
                  <div className="profile-value">{user.headline}</div>
                </div>
              )}
              {isWorker && user.summary && (
                <div>
                  <span className="profile-label">Summary</span>
                  <div className="profile-value">{user.summary}</div>
                </div>
              )}
              {isWorker && user.yearsExperience !== undefined && (
                <div>
                  <span className="profile-label">Experience</span>
                  <div className="profile-value">{user.yearsExperience}+ years</div>
                </div>
              )}
              {isWorker && user.availability && (
                <div>
                  <span className="profile-label">Availability</span>
                  <div className="profile-value">{user.availability}</div>
                </div>
              )}
              {isWorker && formatList(user.skills) && (
                <div>
                  <span className="profile-label">Skills</span>
                  <div className="profile-value">{formatList(user.skills)}</div>
                </div>
              )}
              {isWorker && formatList(user.desiredRoles) && (
                <div>
                  <span className="profile-label">Desired roles</span>
                  <div className="profile-value">{formatList(user.desiredRoles)}</div>
                </div>
              )}
              {isWorker && (user.portfolioUrl || user.linkedinUrl || user.githubUrl) && (
                <div>
                  <span className="profile-label">Links</span>
                  <div className="profile-value">
                    {user.portfolioUrl && <span>{user.portfolioUrl} </span>}
                    {user.linkedinUrl && <span>{user.linkedinUrl} </span>}
                    {user.githubUrl && <span>{user.githubUrl}</span>}
                  </div>
                </div>
              )}
              {isWorker && user.resumeUrl && (
                <div>
                  <span className="profile-label">Resume</span>
                  <div className="profile-value">
                    <a href={user.resumeUrl} target="_blank" rel="noreferrer">
                      View resume
                    </a>
                  </div>
                </div>
              )}
              {isWorker && user.allowContact && (user.email || user.phone || user.chatApp) && (
                <div>
                  <span className="profile-label">Contact</span>
                  <div className="profile-value">
                    {user.email && <span>Email: {user.email} </span>}
                    {user.phone && <span>Phone: {user.phone} </span>}
                    {user.chatApp && (
                      <span>
                        Chat: {user.chatApp}
                        {user.chatHandle ? ` ${user.chatHandle}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {isEmployer && (user.companyName || user.companyWebsite) && (
                <div>
                  <span className="profile-label">Company</span>
                  <div className="profile-value">
                    {user.companyName || 'Company'}{' '}
                    {user.companyWebsite ? `(${user.companyWebsite})` : ''}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {isOwner && (
          <section className="card">
            <h2>Settings</h2>
            <div className="setting-row">
              <span>Theme</span>
              <button
                type="button"
                className="btn-secondary"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {themeLabel}
              </button>
            </div>
            <div className="setting-row">
              <span>Session</span>
              <button onClick={handleLogout} disabled={logoutLoading} className="btn-logout">
                {logoutLoading ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </section>
        )}

        {isOwner && (
          <section className="card profile-edit">
            <h2>Edit profile</h2>
            {message && <p>{message}</p>}
            {error && <p className="error-message">{error}</p>}
            <form className="auth-form" onSubmit={handleSave}>
              <label>
                <span>Name</span>
                <input name="name" value={form.name || ''} onChange={handleChange} />
              </label>
              <label>
                <span>Phone</span>
                <input name="phone" value={form.phone || ''} onChange={handleChange} />
              </label>
              <label>
                <span>Location</span>
                <input name="location" value={form.location || ''} onChange={handleChange} />
              </label>
              <label>
                <span>Profile photo</span>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
                <span className="upload-hint">Upload from device</span>
                {form.profilePicture && (
                  <div className="profile-photo-row">
                    <img
                      className="profile-photo"
                      src={form.profilePicture}
                      alt="Profile preview"
                    />
                    <button
                      type="button"
                      className="icon-button"
                      onClick={handleRemovePhoto}
                      aria-label="Remove photo"
                    >
                      x
                    </button>
                  </div>
                )}
              </label>
              <label>
                <span>Bio</span>
                <textarea name="bio" value={form.bio || ''} onChange={handleChange} />
              </label>

              {isEmployer && (
                <>
                  <label>
                    <span>Company name</span>
                    <input
                      name="companyName"
                      value={form.companyName || ''}
                      onChange={handleChange}
                    />
                  </label>
                  <label>
                    <span>Company website</span>
                    <input
                      name="companyWebsite"
                      value={form.companyWebsite || ''}
                      onChange={handleChange}
                    />
                  </label>
                  <label>
                    <span>Company logo URL</span>
                    <input
                      name="companyLogo"
                      value={
                        form.companyLogo && form.companyLogo.startsWith('data:image/')
                          ? ''
                          : form.companyLogo || ''
                      }
                      onChange={handleChange}
                    />
                  </label>
                  <label>
                    <span>Company logo</span>
                    <input
                      ref={companyLogoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCompanyLogoChange}
                    />
                    <span className="upload-hint">Upload from device</span>
                    {form.companyLogo && (
                      <div className="profile-photo-row">
                        <img
                          className="logo-preview"
                          src={form.companyLogo}
                          alt="Company logo preview"
                        />
                        <button
                          type="button"
                          className="icon-button"
                          onClick={handleRemoveCompanyLogo}
                          aria-label="Remove company logo"
                        >
                          x
                        </button>
                      </div>
                    )}
                  </label>
                  <label>
                    <span>Company description</span>
                    <textarea
                      name="companyDescription"
                      value={form.companyDescription || ''}
                      onChange={handleChange}
                    />
                  </label>
                </>
              )}

              {isWorker && (
                <>
                  <label>
                    <span>Headline</span>
                    <input name="headline" value={form.headline || ''} onChange={handleChange} />
                  </label>
                  <label>
                    <span>Summary</span>
                    <textarea name="summary" value={form.summary || ''} onChange={handleChange} />
                  </label>
                  <label>
                    <span>Skills (comma separated)</span>
                    <input
                      name="skills"
                      value={
                        Array.isArray(form.skills) ? form.skills.join(', ') : form.skills || ''
                      }
                      onChange={handleChange}
                    />
                  </label>
                  <label>
                    <span>Desired roles (comma separated)</span>
                    <input
                      name="desiredRoles"
                      value={
                        Array.isArray(form.desiredRoles)
                          ? form.desiredRoles.join(', ')
                          : form.desiredRoles || ''
                      }
                      onChange={handleChange}
                    />
                  </label>
                  <label>
                    <span>Years of experience</span>
                    <input
                      name="yearsExperience"
                      type="number"
                      value={form.yearsExperience?.toString() || ''}
                      onChange={handleChange}
                    />
                  </label>
                  <label>
                    <span>Availability</span>
                    <select
                      name="availability"
                      value={form.availability || 'open'}
                      onChange={handleChange}
                    >
                      <option value="open">Open to offers</option>
                      <option value="immediately">Immediately</option>
                      <option value="2-weeks">2 weeks</option>
                      <option value="1-month">1 month</option>
                    </select>
                  </label>
                  <label>
                    <span>Portfolio URL</span>
                    <input
                      name="portfolioUrl"
                      value={form.portfolioUrl || ''}
                      onChange={handleChange}
                    />
                  </label>
                  <label>
                    <span>LinkedIn URL</span>
                    <input
                      name="linkedinUrl"
                      value={form.linkedinUrl || ''}
                      onChange={handleChange}
                    />
                  </label>
                  <label>
                    <span>GitHub URL</span>
                    <input name="githubUrl" value={form.githubUrl || ''} onChange={handleChange} />
                  </label>
                  <label>
                    <span>Chat app</span>
                    <input name="chatApp" value={form.chatApp || ''} onChange={handleChange} />
                  </label>
                  <label>
                    <span>Chat handle</span>
                    <input
                      name="chatHandle"
                      value={form.chatHandle || ''}
                      onChange={handleChange}
                    />
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      name="allowContact"
                      checked={form.allowContact === true}
                      onChange={handleChange}
                    />
                    <span>Allow employers to contact me</span>
                  </label>
                </>
              )}

              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
