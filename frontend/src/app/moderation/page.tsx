'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService, moderationService } from '@/services/api';
import { friendlyError } from '@/lib/feedback';

type ReportItem = {
  _id: string;
  reason: string;
  status: string;
  createdAt: string;
  reporterId?: { name?: string; email?: string; roles?: string[] };
  targetUserId?: { name?: string; email?: string; roles?: string[] };
  messageId?: { _id: string; body?: string; createdAt?: string };
  conversationId?: { _id: string };
};

const formatDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export default function ModerationPage() {
  const router = useRouter();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [status, setStatus] = useState('open');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchReports = useCallback(async (nextStatus: string) => {
    setLoading(true);
    try {
      const res = await moderationService.listReports(nextStatus);
      setReports(res.data || []);
      setError(null);
      setStatusMessage(null);
    } catch (e: any) {
      setError(friendlyError(e, 'We could not load reports. Please try again.'));
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

  useEffect(() => {
    fetchReports(status);
  }, [fetchReports, status]);

  const handleResolve = async (reportId: string) => {
    setStatusMessage(null);
    try {
      await moderationService.resolveReport(reportId);
      setReports((prev) =>
        prev.map((report) => (report._id === reportId ? { ...report, status: 'resolved' } : report))
      );
      setStatusMessage('Report marked as resolved.');
    } catch (e: any) {
      setError(friendlyError(e, 'We could not resolve that report. Please try again.'));
    }
  };

  const handleRemoveMessage = async (messageId?: string) => {
    if (!messageId) return;
    setStatusMessage(null);
    try {
      await moderationService.removeMessage(messageId);
      setReports((prev) =>
        prev.map((report) =>
          report.messageId?._id === messageId
            ? { ...report, messageId: { ...report.messageId, body: '[message removed]' } }
            : report
        )
      );
      setStatusMessage('Message removed.');
    } catch (e: any) {
      setError(friendlyError(e, 'We could not remove that message. Please try again.'));
    }
  };

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;
    setStatus(next);
  };

  return (
    <div className="page-container moderation-page">
      <section className="card">
        <div className="panel-head">
          <div>
            <h2>Moderation</h2>
            <p className="muted">Reports and enforcement actions</p>
          </div>
          <div className="panel-actions">
            <select value={status} onChange={handleStatusChange}>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
              <option value="all">All</option>
            </select>
            <button type="button" className="btn-secondary" onClick={() => fetchReports(status)}>
              Refresh
            </button>
          </div>
        </div>
        {loading ? (
          <p className="loading">Loading reports...</p>
        ) : error ? (
          <p className="error-message">{error}</p>
        ) : reports.length === 0 ? (
          <div className="empty-state">
            <strong>No reports found.</strong>
            <p>Incoming reports will appear here.</p>
          </div>
        ) : (
          <div className="moderation-list">
            {reports.map((report) => (
              <div key={report._id} className="moderation-card">
                <div className="moderation-meta">
                  <span className="tag">{report.status}</span>
                  <span className="muted">{formatDate(report.createdAt)}</span>
                </div>
                <p className="moderation-reason">{report.reason}</p>
                <div className="moderation-grid">
                  <div>
                    <span className="profile-label">Reporter</span>
                    <div className="profile-value">
                      {report.reporterId?.name || report.reporterId?.email || 'Unknown'}
                    </div>
                  </div>
                  <div>
                    <span className="profile-label">Target</span>
                    <div className="profile-value">
                      {report.targetUserId?.name || report.targetUserId?.email || 'Unknown'}
                    </div>
                  </div>
                  {report.messageId?.body && (
                    <div>
                      <span className="profile-label">Message</span>
                      <div className="profile-value">{report.messageId.body}</div>
                    </div>
                  )}
                </div>
                <div className="moderation-actions">
                  {report.status !== 'resolved' && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleResolve(report._id)}
                    >
                      Resolve
                    </button>
                  )}
                  {report.messageId?._id && (
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => handleRemoveMessage(report.messageId?._id)}
                    >
                      Remove message
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {statusMessage && <p className="status-message">{statusMessage}</p>}
      </section>
    </div>
  );
}
