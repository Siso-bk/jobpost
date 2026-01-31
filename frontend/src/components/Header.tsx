'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { authService, conversationsService, notificationsService, usersService } from '@/services/api';

export default function Header() {
  const [hydrated, setHydrated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [messageUnread, setMessageUnread] = useState(0);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [myOpen, setMyOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const headerRef = useRef<HTMLDivElement | null>(null);

  const closeAllMenus = useCallback(() => {
    setInboxOpen(false);
    setManageOpen(false);
    setMyOpen(false);
    setAccountOpen(false);
    setMobileOpen(false);
  }, []);

  useEffect(() => {
    let active = true;
    authService
      .me()
      .then((res) => {
        if (!active) return;
        setUserRole(res.data?.role || null);
        setUserId(res.data?.id || null);
        setUserName(res.data?.name || null);
      })
      .catch(() => {
        if (!active) return;
        setUserRole(null);
        setUserId(null);
        setUserName(null);
      })
      .finally(() => {
        if (!active) return;
        setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!userId) return;
    usersService
      .getUserProfile(userId)
      .then((res) => {
        setProfilePicture(res.data?.profilePicture || null);
      })
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setMessageUnread(0);
      setNotificationUnread(0);
      return;
    }
    const refreshCounts = () => {
      conversationsService
        .unreadCount()
        .then((res) => {
          setMessageUnread(Number(res.data?.count || 0));
        })
        .catch(() => {});
      notificationsService
        .list(1)
        .then((res) => {
          setNotificationUnread(Number(res.data?.unreadCount || 0));
        })
        .catch(() => {});
    };
    refreshCounts();
  }, [userId, pathname]);

  useEffect(() => {
    setAccountOpen(false);
    setInboxOpen(false);
    setManageOpen(false);
    setMyOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  const anyMenuOpen = inboxOpen || manageOpen || myOpen || accountOpen || mobileOpen;

  useEffect(() => {
    if (!anyMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAllMenus();
    };
    const handlePointerDown = (event: MouseEvent) => {
      if (!headerRef.current) return;
      if (!headerRef.current.contains(event.target as Node)) {
        closeAllMenus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [anyMenuOpen, closeAllMenus]);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {}
    setUserRole(null);
    setUserId(null);
    setUserName(null);
    setProfilePicture(null);
    router.replace('/login');
  };

  const isAuthed = hydrated && Boolean(userRole);
  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === '/jobs') return pathname === '/jobs' || pathname.startsWith('/job/');
    if (href === '/profile') return pathname.startsWith('/profile');
    if (href === '/employer') return pathname === '/employer';
    if (href === '/messages') return pathname.startsWith('/messages');
    if (href === '/notifications') return pathname.startsWith('/notifications');
    return pathname === href || pathname.startsWith(`${href}/`);
  };
  const inboxUnread = messageUnread + notificationUnread;
  const inboxActive = isActive('/messages') || isActive('/notifications');
  const manageActive =
    userRole === 'employer' &&
    (isActive('/employer') ||
      isActive('/post-job') ||
      isActive('/employer/jobs') ||
      isActive('/employer/applications'));
  const myActive =
    userRole === 'worker' && (isActive('/my-applications') || isActive('/worker/cv'));

  return (
    <header className="header" ref={headerRef}>
      <div className="header-content">
        <div className="header-top">
          <Link href="/" className="logo">
            JobPost
          </Link>
          <button
            type="button"
            className={`nav-toggle ${mobileOpen ? 'open' : ''}`}
            onClick={() => {
              setMobileOpen((open) => !open);
              setAccountOpen(false);
              setInboxOpen(false);
              setManageOpen(false);
              setMyOpen(false);
            }}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                d="M3 6h18M3 12h18M3 18h18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <nav className={`nav ${mobileOpen ? 'is-open' : ''}`}>
          {!isAuthed ? (
            <>
              <Link href="/talent" className={`nav-link ${isActive('/talent') ? 'active' : ''}`}>
                Talent
              </Link>
              <Link href="/login" className={`nav-link ${isActive('/login') ? 'active' : ''}`}>
                Login
              </Link>
              <Link
                href="/register"
                className={`btn-primary nav-link ${isActive('/register') ? 'active' : ''}`}
              >
                Register
              </Link>
            </>
          ) : (
            <>
              <Link href="/jobs" className={`nav-link ${isActive('/jobs') ? 'active' : ''}`}>
                Jobs
              </Link>
              {userRole === 'employer' && (
                <Link href="/talent" className={`nav-link ${isActive('/talent') ? 'active' : ''}`}>
                  Talent
                </Link>
              )}
              {userRole === 'employer' && (
                <div className="account-menu">
                  <button
                    type="button"
                    className={`account-trigger nav-link ${manageActive ? 'active' : ''}`}
                    onClick={() => {
                      setManageOpen((open) => !open);
                      setInboxOpen(false);
                      setMyOpen(false);
                      setAccountOpen(false);
                    }}
                    aria-haspopup="menu"
                    aria-expanded={manageOpen}
                  >
                    <span>Manage</span>
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                      <path
                        d="M6 9l6 6 6-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  {manageOpen && (
                    <div className="account-dropdown align-left menu-grid" role="menu">
                      <div className="menu-section">
                        <div className="menu-title">Overview</div>
                        <Link href="/employer" className="account-item menu-item" role="menuitem">
                          <span className="menu-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" width="18" height="18">
                              <rect
                                x="3"
                                y="3"
                                width="8"
                                height="8"
                                rx="2"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              />
                              <rect
                                x="13"
                                y="3"
                                width="8"
                                height="8"
                                rx="2"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              />
                              <rect
                                x="3"
                                y="13"
                                width="8"
                                height="8"
                                rx="2"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              />
                              <rect
                                x="13"
                                y="13"
                                width="8"
                                height="8"
                                rx="2"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              />
                            </svg>
                          </span>
                          Dashboard
                        </Link>
                        <Link href="/post-job" className="account-item menu-item" role="menuitem">
                          <span className="menu-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" width="18" height="18">
                              <path
                                d="M12 5v14M5 12h14"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </span>
                          Post Job
                        </Link>
                      </div>
                      <div className="menu-section menu-section-divider">
                        <div className="menu-title">Hiring</div>
                        <Link href="/employer/jobs" className="account-item menu-item" role="menuitem">
                          <span className="menu-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" width="18" height="18">
                              <path
                                d="M7 7h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M9 7V5h6v2"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                          My Jobs
                        </Link>
                        <Link
                          href="/employer/applications"
                          className="account-item menu-item"
                          role="menuitem"
                        >
                          <span className="menu-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" width="18" height="18">
                              <path
                                d="M4 13l2 6h12l2-6"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M4 13h4l2 3h4l2-3h4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                          Applications
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {userRole === 'worker' && (
                <div className="account-menu">
                  <button
                    type="button"
                    className={`account-trigger nav-link ${myActive ? 'active' : ''}`}
                    onClick={() => {
                      setMyOpen((open) => !open);
                      setInboxOpen(false);
                      setManageOpen(false);
                      setAccountOpen(false);
                    }}
                    aria-haspopup="menu"
                    aria-expanded={myOpen}
                  >
                    <span>My</span>
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                      <path
                        d="M6 9l6 6 6-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  {myOpen && (
                    <div className="account-dropdown align-left" role="menu">
                      <div className="menu-title">My workspace</div>
                      <Link href="/my-applications" className="account-item menu-item" role="menuitem">
                        <span className="menu-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" width="18" height="18">
                            <path
                              d="M6 3h8l4 4v14H6z"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M9 14l2 2 4-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        My Applications
                      </Link>
                      <div className="menu-divider" role="separator" />
                      <Link href="/worker/cv" className="account-item menu-item" role="menuitem">
                        <span className="menu-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" width="18" height="18">
                            <path
                              d="M6 3h8l4 4v14H6z"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M8 12h8M8 16h6"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </span>
                        My CV
                      </Link>
                    </div>
                  )}
                </div>
              )}
              <div className="account-menu">
                <button
                  type="button"
                  className={`account-trigger nav-link ${inboxActive ? 'active' : ''}`}
                  onClick={() => {
                    setInboxOpen((open) => !open);
                    setAccountOpen(false);
                    setManageOpen(false);
                    setMyOpen(false);
                  }}
                  aria-haspopup="menu"
                  aria-expanded={inboxOpen}
                >
                  <span>Inbox</span>
                  {inboxUnread > 0 && <span className="nav-badge">{inboxUnread}</span>}
                  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                    <path
                      d="M6 9l6 6 6-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {inboxOpen && (
                  <div className="account-dropdown" role="menu">
                    <div className="menu-title">Inbox</div>
                    <Link href="/messages" className="account-item menu-item" role="menuitem">
                      <span className="menu-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                          <path
                            d="M4 5h16a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-5 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      Messages
                      {messageUnread > 0 && (
                        <span className="nav-badge menu-count">{messageUnread}</span>
                      )}
                    </Link>
                    <div className="menu-divider" role="separator" />
                    <Link href="/notifications" className="account-item menu-item" role="menuitem">
                      <span className="menu-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                          <path
                            d="M15 17H9"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <path
                            d="M6 17V9a6 6 0 1 1 12 0v8l2 2H4z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      Alerts
                      {notificationUnread > 0 && (
                        <span className="nav-badge menu-count">{notificationUnread}</span>
                      )}
                    </Link>
                  </div>
                )}
              </div>
              <div className="account-menu">
                <button
                  type="button"
                  className="account-trigger"
                  onClick={() => {
                    setAccountOpen((open) => !open);
                    setInboxOpen(false);
                    setManageOpen(false);
                    setMyOpen(false);
                  }}
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                >
                  <span className="nav-avatar">
                    {profilePicture ? (
                      <img src={profilePicture} alt="Profile" />
                    ) : (
                      <span className="nav-initial">
                        {(userName || 'U').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span>Account</span>
                  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                    <path
                      d="M6 9l6 6 6-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {accountOpen && (
                  <div className="account-dropdown" role="menu">
                    <div className="menu-title">Account</div>
                    <Link
                      href={`/profile/${userId || ''}`}
                      className="account-item menu-item"
                      role="menuitem"
                    >
                      <span className="menu-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                          <circle
                            cx="12"
                            cy="8"
                            r="4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <path
                            d="M4 20a8 8 0 0 1 16 0"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                      Profile
                    </Link>
                    <Link href="/profile/settings" className="account-item menu-item" role="menuitem">
                      <span className="menu-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                          <circle
                            cx="12"
                            cy="12"
                            r="3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          />
                          <path
                            d="M4 12h2m12 0h2M12 4v2m0 12v2M6.2 6.2l1.4 1.4m8.8 8.8l1.4 1.4M17.8 6.2l-1.4 1.4m-8.8 8.8l-1.4 1.4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                      Settings
                    </Link>
                    <div className="menu-divider" role="separator" />
                    <button
                      type="button"
                      className="account-item account-logout menu-item"
                      onClick={handleLogout}
                      role="menuitem"
                    >
                      <span className="menu-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                          <path
                            d="M7 12h10"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <path
                            d="M13 8l4 4-4 4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M5 5h5M5 19h5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
