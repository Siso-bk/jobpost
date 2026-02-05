'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  authService,
  blocksService,
  conversationsService,
  reportsService,
  usersService,
} from '@/services/api';
import { getMaskedAssetUrl, isInternalAssetUrl } from '@/lib/assets';
import { friendlyError } from '@/lib/feedback';
import { AppRole, getRoleLabel, hasRole, normalizeRoles } from '@/lib/roles';

type UserProfile = {
  name?: string;
  email?: string;
  roles?: AppRole[];
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
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [themeReady, setThemeReady] = useState(false);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerRoles, setViewerRoles] = useState<AppRole[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [blockStatus, setBlockStatus] = useState({ blocked: false, blockedBy: false });
  const [blockLoading, setBlockLoading] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const companyLogoInputRef = useRef<HTMLInputElement | null>(null);
  const companyLogoMasked = isInternalAssetUrl(form.companyLogo);

  useEffect(() => {
    let active = true;
    authService
      .me()
      .then((res) => {
        if (!active) return;
        setViewerId(res.data?.id || null);
        setViewerRoles(normalizeRoles(res.data?.roles));
      })
      .catch(() => {
        if (!active) return;
        setViewerId(null);
        setViewerRoles([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    setStatusMessage(null);
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
      .catch((e) => setError(friendlyError(e, 'We could not load this profile. Please try again.')))
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
    setStatusMessage(null);
    try {
      await authService.logout();
      router.replace('/login');
    } catch (e: any) {
      setError(friendlyError(e, 'We could not log you out. Please try again.'));
      setLogoutLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userId || !isOwner) return;
    if (deleteConfirm.trim().toUpperCase() !== 'DELETE') {
      setError('Type DELETE to confirm account deletion.');
      return;
    }
    setDeleteLoading(true);
    setError(null);
    setMessage(null);
    setStatusMessage(null);
    try {
      await usersService.deleteMe();
      router.replace('/login');
    } catch (e: any) {
      setError(friendlyError(e, 'We could not delete the account. Please try again.'));
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    if (!viewerId || !userId || viewerId === userId) {
      setBlockStatus({ blocked: false, blockedBy: false });
      return;
    }
    blocksService
      .status(userId)
      .then((res) => {
        setBlockStatus({
          blocked: Boolean(res.data?.blocked),
          blockedBy: Boolean(res.data?.blockedBy),
        });
      })
      .catch(() => {
        setBlockStatus({ blocked: false, blockedBy: false });
      });
  }, [viewerId, userId]);

  const handleToggleBlock = async () => {
    if (!viewerId || !userId || viewerId === userId) return;
    setBlockLoading(true);
    setError(null);
    setStatusMessage(null);
    try {
      if (blockStatus.blocked) {
        await blocksService.unblock(userId);
        setBlockStatus({ blocked: false, blockedBy: false });
        setStatusMessage('User unblocked. You can message them again.');
      } else {
        await blocksService.block(userId);
        setBlockStatus({ blocked: true, blockedBy: false });
        setStatusMessage('User blocked. You will no longer receive messages.');
      }
    } catch (e: any) {
      setError(friendlyError(e, 'We could not update block status. Please try again.'));
    } finally {
      setBlockLoading(false);
    }
  };

  const handleReport = async () => {
    if (!viewerId || !userId || viewerId === userId) return;
    const reason = reportReason.trim();
    if (!reason) {
      setReportStatus('Please add a reason.');
      return;
    }
    setReportLoading(true);
    setReportStatus(null);
    setStatusMessage(null);
    try {
      await reportsService.create({ targetUserId: userId, reason });
      setReportStatus('Report submitted.');
      setReportReason('');
      setStatusMessage('Report submitted. Thanks for letting us know.');
    } catch (e: any) {
      setReportStatus(friendlyError(e, 'We could not submit the report. Please try again.'));
    } finally {
      setReportLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!viewerId || !userId || isOwner) return;
    setChatLoading(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await conversationsService.create(userId);
      const conversationId = res.data?.id || res.data?._id;
      if (conversationId) {
        router.push(`/messages?c=${conversationId}`);
      } else {
        setError('We could not start a chat. Please try again.');
      }
    } catch (e: any) {
      setError(friendlyError(e, 'We could not start a chat. Please try again.'));
    } finally {
      setChatLoading(false);
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
    setStatusMessage(null);
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
      setMessage('Changes saved. Your profile is up to date.');
    } catch (e: any) {
      setError(friendlyError(e, 'We could not save your changes. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const isOwner = Boolean(viewerId && viewerId === userId);
  const profileRoles = normalizeRoles(user?.roles);
  const rolesForView = profileRoles.length ? profileRoles : viewerRoles;
  const isEmployer = hasRole(rolesForView, 'employer');
  const isWorker = hasRole(rolesForView, 'worker');
  const roleLabel = getRoleLabel(rolesForView);
  const canMessage = !blockStatus.blocked && !blockStatus.blockedBy;
  const deleteReady = deleteConfirm.trim().toUpperCase() === 'DELETE';
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
          {!isOwner && viewerId && (
            <div className="profile-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleStartChat}
                disabled={chatLoading || !canMessage}
              >
                {chatLoading ? 'Opening chat...' : 'Message'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleToggleBlock}
                disabled={blockLoading || blockStatus.blockedBy}
              >
                {blockStatus.blockedBy ? 'Blocked' : blockStatus.blocked ? 'Unblock' : 'Block'}
              </button>
            </div>
          )}
          {!isOwner && viewerId && blockStatus.blockedBy && (
            <p className="status-message">This user has blocked you.</p>
          )}
          {loading && <p>Loading profile...</p>}
          {statusMessage && <p className="status-message">{statusMessage}</p>}
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
                <div className="profile-value tag">{roleLabel}</div>
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

        {!isOwner && viewerId && (
          <section className="card">
            <h2>Safety</h2>
            <p className="status-message">
              Report this user if something feels off. We review all reports.
            </p>
            <label className="report-label">
              <span>Reason</span>
              <textarea
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                placeholder="Share details for review"
              />
            </label>
            <button
              type="button"
              className="btn-danger"
              onClick={handleReport}
              disabled={reportLoading}
            >
              {reportLoading ? 'Submitting...' : 'Submit report'}
            </button>
            {reportStatus && <p className="status-message">{reportStatus}</p>}
          </section>
        )}

        {isOwner && (
          <section className="card danger-zone">
            <h2>Danger zone</h2>
            <p className="status-message">
              {isEmployer
                ? 'Deleting your account removes your company profile, jobs, and applications. This cannot be undone.'
                : 'Deleting your account removes your profile and applications. This cannot be undone.'}
            </p>
            <div className="danger-actions">
              <label>
                <span>Type DELETE to confirm</span>
                <input
                  value={deleteConfirm}
                  onChange={(event) => setDeleteConfirm(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn-danger"
                onClick={handleDeleteAccount}
                disabled={deleteLoading || !deleteReady}
              >
                {deleteLoading ? 'Deleting...' : 'Delete account'}
              </button>
            </div>
          </section>
        )}

        {isOwner && (
          <section className="card profile-edit">
            <h2>Edit profile</h2>
            {message && <p className="status-message">{message}</p>}
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
                      placeholder={
                        companyLogoMasked ? 'Uploaded logo stored in JobPost' : 'https://...'
                      }
                      value={getMaskedAssetUrl(form.companyLogo)}
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

              <button type="submit" className="btn-primary form-action-center" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
