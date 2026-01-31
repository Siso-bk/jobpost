'use client';
import React, { useEffect, useState } from 'react';
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
  const [accountOpen, setAccountOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

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
  }, [pathname]);

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

  return (
    <header className="header">
      <div className="header-content">
        <Link href="/" className="logo">
          JobPost
        </Link>
        <nav className="nav">
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
                <Link
                  href="/post-job"
                  className={`nav-link ${isActive('/post-job') ? 'active' : ''}`}
                >
                  Post Job
                </Link>
              )}
              {userRole === 'employer' && (
                <Link
                  href="/employer"
                  className={`nav-link ${isActive('/employer') ? 'active' : ''}`}
                >
                  Dashboard
                </Link>
              )}
              {userRole === 'employer' && (
                <Link
                  href="/employer/jobs"
                  className={`nav-link ${isActive('/employer/jobs') ? 'active' : ''}`}
                >
                  My Jobs
                </Link>
              )}
              {userRole === 'employer' && (
                <Link
                  href="/employer/applications"
                  className={`nav-link ${isActive('/employer/applications') ? 'active' : ''}`}
                >
                  Applications
                </Link>
              )}
              {userRole === 'employer' && (
                <Link href="/talent" className={`nav-link ${isActive('/talent') ? 'active' : ''}`}>
                  Talent
                </Link>
              )}
              {userRole === 'worker' && (
                <Link
                  href="/my-applications"
                  className={`nav-link ${isActive('/my-applications') ? 'active' : ''}`}
                >
                  My Applications
                </Link>
              )}
              {userRole === 'worker' && (
                <Link
                  href="/worker/cv"
                  className={`nav-link ${isActive('/worker/cv') ? 'active' : ''}`}
                >
                  My CV
                </Link>
              )}
              <div className="account-menu">
                <button
                  type="button"
                  className={`account-trigger nav-link ${inboxActive ? 'active' : ''}`}
                  onClick={() => {
                    setInboxOpen((open) => !open);
                    setAccountOpen(false);
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
                    <Link href="/messages" className="account-item" role="menuitem">
                      Messages
                      {messageUnread > 0 && <span className="nav-badge">{messageUnread}</span>}
                    </Link>
                    <Link href="/notifications" className="account-item" role="menuitem">
                      Alerts
                      {notificationUnread > 0 && (
                        <span className="nav-badge">{notificationUnread}</span>
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
                    <Link href={`/profile/${userId || ''}`} className="account-item" role="menuitem">
                      Profile
                    </Link>
                    <Link href="/profile/settings" className="account-item" role="menuitem">
                      Settings
                    </Link>
                    <button
                      type="button"
                      className="account-item account-logout"
                      onClick={handleLogout}
                      role="menuitem"
                    >
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
