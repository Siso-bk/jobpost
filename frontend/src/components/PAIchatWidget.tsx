'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const RAW_WIDGET_ORIGIN =
  process.env.NEXT_PUBLIC_PAICHAT_WIDGET_ORIGIN || 'https://paichat-seven.vercel.app';
const WIDGET_ORIGIN = (() => {
  try {
    return new URL(RAW_WIDGET_ORIGIN).origin;
  } catch {
    return RAW_WIDGET_ORIGIN.replace(/\/$/, '');
  }
})();
const DEFAULT_TITLE = process.env.NEXT_PUBLIC_PAICHAT_WIDGET_TITLE || 'PAIchat';
const DEFAULT_THEME = process.env.NEXT_PUBLIC_PAICHAT_WIDGET_THEME || 'auto';

export default function PAIchatWidget() {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [widgetReady, setWidgetReady] = useState(false);
  const [widgetSrc, setWidgetSrc] = useState('');
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({
      title: DEFAULT_TITLE,
      theme: DEFAULT_THEME,
      origin: window.location.origin,
    });
    setWidgetSrc(`${WIDGET_ORIGIN}/widget?${params.toString()}`);
  }, []);

  const fetchToken = useCallback(async () => {
    setStatus('');
    try {
      const res = await fetch('/api/paichat/token', { credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Sign in to use PAIchat.');
      }
      const data = await res.json();
      if (!data?.token) {
        throw new Error('PAIchat token missing.');
      }
      setToken(data.token as string);
    } catch (err: any) {
      setStatus(err?.message || 'Sign in to use PAIchat.');
    }
  }, []);

  useEffect(() => {
    if (open && !token) {
      void fetchToken();
    }
  }, [open, token, fetchToken]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== WIDGET_ORIGIN) return;
      const payload = event.data;
      if (!payload || typeof payload !== 'object') return;
      if (payload.type === 'PAICHAT_WIDGET_READY') {
        setWidgetReady(true);
      }
    };
    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
    };
  }, []);

  const sendToken = useCallback(() => {
    if (!token) return;
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    target.postMessage(
      { type: 'PAICHAT_WIDGET_TOKEN', token, title: DEFAULT_TITLE, theme: DEFAULT_THEME },
      WIDGET_ORIGIN
    );
  }, [token]);

  useEffect(() => {
    if (!widgetReady || !token) return;
    sendToken();
  }, [widgetReady, token, sendToken]);

  useEffect(() => {
    if (open && token) {
      sendToken();
    }
  }, [open, token, sendToken]);

  useEffect(() => {
    if (!open) {
      setWidgetReady(false);
    }
  }, [open]);

  return (
    <div className={`paichat-launcher ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="paichat-fab"
        aria-expanded={open}
        aria-label={open ? 'Close PAIchat' : 'Open PAIchat'}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="paichat-fab-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
          </svg>
        </span>
      </button>
      <div className="paichat-panel" aria-hidden={!open}>
        <button
          type="button"
          className="paichat-close"
          onClick={() => setOpen(false)}
          aria-label="Close PAIchat"
        >
          <span aria-hidden="true">×</span>
        </button>
        {status && (
          <div className="paichat-status">
            {status}
            <button
              type="button"
              className="paichat-cta"
              onClick={() => (window.location.href = '/login')}
            >
              Sign in
            </button>
          </div>
        )}
        {widgetSrc ? (
          <iframe
            ref={iframeRef}
            className="paichat-frame"
            src={widgetSrc}
            title="PAIchat"
            onLoad={() => {
              setWidgetReady(true);
              sendToken();
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
