'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService, notificationsService } from '@/services/api';

type NotificationItem = {
  _id: string;
  title?: string;
  body?: string;
  link?: string;
  createdAt?: string;
  readAt?: string | null;
};

const formatTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    let active = true;
    authService
      .me()
      .then((res) => {
        if (!active) return;
        if (!res.data?.id) {
          router.replace('/login');
        }
      })
      .catch(() => {
        if (!active) return;
        router.replace('/login');
      });
    return () => {
      active = false;
    };
  }, [router]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationsService.list();
      setNotifications(res.data?.notifications || []);
      setUnreadCount(res.data?.unreadCount || 0);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    setMarking(true);
    try {
      await notificationsService.markAllRead();
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.readAt ? notification : { ...notification, readAt: new Date().toISOString() }
        )
      );
      setUnreadCount(0);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to mark notifications read');
    } finally {
      setMarking(false);
    }
  };

  const handleOpen = async (notification: NotificationItem) => {
    if (!notification.readAt) {
      try {
        await notificationsService.markRead(notification._id);
        setNotifications((prev) =>
          prev.map((item) =>
            item._id === notification._id ? { ...item, readAt: new Date().toISOString() } : item
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {}
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <div className="page-container notifications-page">
      <section className="card">
        <div className="panel-head">
          <div>
            <h2>Notifications</h2>
            <p className="muted">{unreadCount} unread</p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleMarkAllRead}
            disabled={marking || unreadCount === 0}
          >
            {marking ? 'Marking...' : 'Mark all read'}
          </button>
        </div>
        {loading ? (
          <p className="loading">Loading notifications...</p>
        ) : error ? (
          <p className="error-message">{error}</p>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <strong>No notifications yet.</strong>
            <p>New activity will show up here.</p>
          </div>
        ) : (
          <div className="notification-list">
            {notifications.map((notification) => (
              <button
                key={notification._id}
                type="button"
                className={`notification-item ${notification.readAt ? '' : 'unread'}`}
                onClick={() => handleOpen(notification)}
              >
                <div className="notification-body">
                  <strong>{notification.title || 'Notification'}</strong>
                  {notification.body && <p>{notification.body}</p>}
                </div>
                <span className="muted">{formatTime(notification.createdAt)}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
