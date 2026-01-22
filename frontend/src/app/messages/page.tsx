'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService, blocksService, conversationsService, reportsService } from '@/services/api';

type ConversationItem = {
  id: string;
  other: {
    id: string;
    name?: string;
    profilePicture?: string;
    role?: string;
    companyName?: string;
  } | null;
  lastMessageText?: string;
  lastMessageAt?: string;
  updatedAt?: string;
  unreadCount?: number;
};

type MessageItem = {
  _id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
};

const formatShortDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryConversationId = searchParams.get('c');
  const [meId, setMeId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [blockStatus, setBlockStatus] = useState({ blocked: false, blockedBy: false });
  const [blockLoading, setBlockLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) || null,
    [conversations, activeId]
  );

  useEffect(() => {
    let active = true;
    authService
      .me()
      .then((res) => {
        if (!active) return;
        const id = res.data?.id;
        if (!id) {
          router.replace('/login');
          return;
        }
        setMeId(id);
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
    if (queryConversationId) {
      setActiveId(queryConversationId);
    }
  }, [queryConversationId]);

  useEffect(() => {
    if (!meId) return;
    setLoading(true);
    conversationsService
      .list()
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setConversations(data);
        setError(null);
        setActiveId((prev) => {
          if (prev) return prev;
          if (queryConversationId) return queryConversationId;
          return data[0]?.id || null;
        });
      })
      .catch((e) => {
        setError(e?.response?.data?.message || 'Failed to load conversations');
      })
      .finally(() => setLoading(false));
  }, [meId, queryConversationId]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    setReportOpen(false);
    setReportReason('');
    setReportStatus(null);
    setMessageError(null);
    setLoadingMessages(true);
    conversationsService
      .getMessages(activeId)
      .then((res) => {
        setMessages(res.data?.messages || []);
        setMessageError(null);
      })
      .catch((e) => {
        setMessageError(e?.response?.data?.message || 'Failed to load messages');
        setMessages([]);
      })
      .finally(() => setLoadingMessages(false));
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    conversationsService
      .markRead(activeId)
      .then(() => {
        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.id === activeId ? { ...conversation, unreadCount: 0 } : conversation
          )
        );
      })
      .catch(() => {});
  }, [activeId]);

  useEffect(() => {
    const otherId = activeConversation?.other?.id;
    if (!otherId) return;
    setBlockLoading(true);
    blocksService
      .status(otherId)
      .then((res) => {
        setBlockStatus({
          blocked: Boolean(res.data?.blocked),
          blockedBy: Boolean(res.data?.blockedBy)
        });
      })
      .catch(() => {
        setBlockStatus({ blocked: false, blockedBy: false });
      })
      .finally(() => setBlockLoading(false));
  }, [activeConversation?.other?.id]);

  useEffect(() => {
    if (!messageEndRef.current) return;
    messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConversation = (conversationId: string) => {
    setActiveId(conversationId);
    router.replace(`/messages?c=${conversationId}`);
  };

  const handleToggleBlock = async () => {
    const otherId = activeConversation?.other?.id;
    if (!otherId || blockLoading) return;
    setBlockLoading(true);
    setMessageError(null);
    try {
      if (blockStatus.blocked) {
        await blocksService.unblock(otherId);
        setBlockStatus({ blocked: false, blockedBy: false });
      } else {
        await blocksService.block(otherId);
        setBlockStatus({ blocked: true, blockedBy: false });
      }
    } catch (e: any) {
      setMessageError(e?.response?.data?.message || 'Unable to update block status');
    } finally {
      setBlockLoading(false);
    }
  };

  const handleReport = async () => {
    const otherId = activeConversation?.other?.id;
    if (!otherId || reportLoading) return;
    const reason = reportReason.trim();
    if (!reason) {
      setReportStatus('Please add a reason.');
      return;
    }
    setReportLoading(true);
    setReportStatus(null);
    try {
      await reportsService.create({
        targetUserId: otherId,
        conversationId: activeId || undefined,
        reason
      });
      setReportStatus('Report submitted.');
      setReportReason('');
      setReportOpen(false);
    } catch (e: any) {
      setReportStatus(e?.response?.data?.message || 'Unable to submit report.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeId || sending) return;
    if (blockStatus.blocked || blockStatus.blockedBy) {
      setMessageError('Messaging is blocked.');
      return;
    }
    const trimmed = draft.trim();
    if (!trimmed) {
      setMessageError('Type a message first.');
      return;
    }
    setSending(true);
    setMessageError(null);
    try {
      const res = await conversationsService.sendMessage(activeId, trimmed);
      const newMessage = res.data?.message;
      if (newMessage) {
        setMessages((prev) => [...prev, newMessage]);
        setDraft('');
        setConversations((prev) => {
          const updatedAt = newMessage.createdAt;
          const next = prev.map((conversation) =>
            conversation.id === activeId
              ? {
                  ...conversation,
                  lastMessageText: trimmed,
                  lastMessageAt: updatedAt,
                  updatedAt
                }
              : conversation
          );
          return [...next].sort((a, b) => {
            const aTime = new Date(a.updatedAt || a.lastMessageAt || 0).getTime();
            const bTime = new Date(b.updatedAt || b.lastMessageAt || 0).getTime();
            return bTime - aTime;
          });
        });
      }
    } catch (e: any) {
      setMessageError(e?.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const messagingDisabled = blockStatus.blocked || blockStatus.blockedBy;

  return (
    <div className="page-container messages-page">
      <div className="messages-grid">
        <section className="card conversations-panel">
          <div className="panel-head">
            <h2>Messages</h2>
            <span className="muted">{conversations.length}</span>
          </div>
          {loading ? (
            <p className="loading">Loading conversations...</p>
          ) : error ? (
            <p className="error-message">{error}</p>
          ) : conversations.length === 0 ? (
            <p className="muted">No conversations yet.</p>
          ) : (
            <div className="conversation-list">
              {conversations.map((conversation) => {
                const isActive = conversation.id === activeId;
                const name =
                  conversation.other?.name ||
                  conversation.other?.companyName ||
                  'Unknown user';
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    className={`conversation-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectConversation(conversation.id)}
                  >
                    <div className="conversation-avatar">
                      {conversation.other?.profilePicture ? (
                        <img src={conversation.other.profilePicture} alt={name} />
                      ) : (
                        <span>{name.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="conversation-body">
                      <div className="conversation-row">
                        <strong>{name}</strong>
                        <div className="conversation-meta">
                          {conversation.unreadCount ? (
                            <span className="unread-badge">{conversation.unreadCount}</span>
                          ) : null}
                          <span className="muted">
                            {formatShortDate(
                              conversation.lastMessageAt || conversation.updatedAt
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="conversation-preview">
                        {conversation.lastMessageText || 'Start the conversation'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="card messages-panel">
          {!activeConversation ? (
            <div className="empty-state">
              <strong>Select a conversation.</strong>
              <p>Pick a contact to view messages.</p>
            </div>
          ) : (
            <>
              <div className="panel-head">
                <div>
                  <h2>{activeConversation.other?.name || 'Conversation'}</h2>
                  <p className="muted">
                    {activeConversation.other?.role || 'Member'} chat
                  </p>
                </div>
                <div className="panel-actions">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setReportOpen((prev) => !prev)}
                  >
                    Report
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleToggleBlock}
                    disabled={blockLoading || Boolean(blockStatus.blockedBy)}
                  >
                    {blockStatus.blockedBy
                      ? 'Blocked'
                      : blockStatus.blocked
                      ? 'Unblock'
                      : 'Block'}
                  </button>
                </div>
              </div>
              {reportOpen && (
                <div className="report-box">
                  <label>
                    <span>Reason for report</span>
                    <textarea
                      value={reportReason}
                      onChange={(event) => setReportReason(event.target.value)}
                      placeholder="Tell us what happened"
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
                </div>
              )}
              {messagingDisabled && (
                <p className="status-message">
                  {blockStatus.blockedBy
                    ? 'This user has blocked you.'
                    : 'You blocked this user.'}
                </p>
              )}
              {loadingMessages ? (
                <p className="loading">Loading messages...</p>
              ) : messageError ? (
                <p className="error-message">{messageError}</p>
              ) : (
                <div className="message-thread">
                  <div className="message-list">
                    {messages.length === 0 ? (
                      <p className="muted">Send the first message.</p>
                    ) : (
                      messages.map((message) => {
                        const isSender = message.senderId === meId;
                        return (
                          <div
                            key={message._id}
                            className={`message-bubble ${isSender ? 'sent' : 'received'}`}
                          >
                            <p>{message.body}</p>
                            <span className="message-time">
                              {formatTime(message.createdAt)}
                            </span>
                          </div>
                        );
                      })
                    )}
                    <div ref={messageEndRef} />
                  </div>
                  <form className="message-input" onSubmit={handleSend}>
                    <input
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Type a message"
                      disabled={sending || messagingDisabled}
                    />
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={sending || messagingDisabled}
                    >
                      {sending ? 'Sending...' : 'Send'}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
