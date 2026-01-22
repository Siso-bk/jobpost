'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { authService, conversationsService, notificationsService, usersService } from '@/services/api';

export default function Header() {
  const [hydrated, setHydrated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [messageUnread, setMessageUnread] = useState(0);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    authService
      .me()
      .then((res) => {
        if (!active) return;
        setUserRole(res.data?.role || null);
        setUserId(res.data?.id || null);
      })
      .catch(() => {
        if (!active) return;
        setUserRole(null);
        setUserId(null);
      })
      .finally(() => {
        if (!active) return;
        setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

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
              <Link href="/messages" className={`nav-link ${isActive('/messages') ? 'active' : ''}`}>
                Messages
                {messageUnread > 0 && <span className="nav-badge">{messageUnread}</span>}
              </Link>
              <Link
                href="/notifications"
                className={`nav-link ${isActive('/notifications') ? 'active' : ''}`}
              >
                Alerts
                {notificationUnread > 0 && (
                  <span className="nav-badge">{notificationUnread}</span>
                )}
              </Link>
              <Link
                href={`/profile/${userId || ''}`}
                className={`nav-link ${isActive('/profile') ? 'active' : ''}`}
              >
                Profile
              </Link>
              {profilePicture && (
                <Link href={`/profile/${userId || ''}`} className="nav-avatar">
                  <img src={profilePicture} alt="Profile" />
                </Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
