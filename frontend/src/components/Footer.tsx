'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { DEFAULT_HOME_CONTENT, mergeHomeContent, type HomeContent } from '@/lib/homeContent';
import { publicService } from '@/services/api';

const Icons: Record<string, React.ReactNode> = {
  linkedin: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.94 6.5a1.9 1.9 0 1 1-3.8 0 1.9 1.9 0 0 1 3.8 0zM3.8 8.5h3.2v11.7H3.8V8.5zm6.05 0h3.05v1.6h.05c.42-.8 1.44-1.6 2.97-1.6 3.18 0 3.77 2.09 3.77 4.8v6.9h-3.2v-6.1c0-1.46-.03-3.33-2.03-3.33-2.03 0-2.34 1.59-2.34 3.23v6.2H9.85V8.5z"
      />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.9 3H21l-6.9 7.9L22 21h-6.4l-4.9-6.1L5.4 21H3.3l7.4-8.4L2 3h6.5l4.4 5.6L18.9 3zm-1 16h1.3L8.7 4.9H7.3L17.9 19z"
      />
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2C6.48 2 2 6.58 2 12.26c0 4.5 2.87 8.32 6.84 9.67.5.1.68-.22.68-.48 0-.24-.01-.86-.01-1.68-2.78.62-3.37-1.37-3.37-1.37-.45-1.19-1.11-1.5-1.11-1.5-.9-.64.07-.63.07-.63 1 .07 1.52 1.06 1.52 1.06.89 1.56 2.34 1.11 2.9.85.09-.67.35-1.11.64-1.37-2.22-.26-4.56-1.15-4.56-5.12 0-1.13.39-2.06 1.03-2.79-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.06A9.3 9.3 0 0 1 12 6.65c.85 0 1.7.12 2.5.35 1.9-1.34 2.74-1.06 2.74-1.06.55 1.4.2 2.44.1 2.7.64.73 1.03 1.66 1.03 2.79 0 3.98-2.35 4.86-4.58 5.12.36.33.69.98.69 1.97 0 1.42-.01 2.57-.01 2.92 0 .27.18.59.69.48 3.96-1.35 6.83-5.17 6.83-9.67C22 6.58 17.52 2 12 2z"
      />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M13.5 9.5V7.3c0-.8.5-1.3 1.3-1.3h1.6V2.6h-2.2c-2.6 0-4.2 1.6-4.2 4.2v2.7H7.6v3.3h2.4V21h3.5v-8.2h2.6l.4-3.3h-3z"
      />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 7.3A4.7 4.7 0 1 0 16.7 12 4.7 4.7 0 0 0 12 7.3zm0 7.7A3 3 0 1 1 15 12a3 3 0 0 1-3 3zm6-8.3a1.1 1.1 0 1 1-1.1-1.1A1.1 1.1 0 0 1 18 6.7z"
      />
      <path
        fill="currentColor"
        d="M17.4 3H6.6A3.6 3.6 0 0 0 3 6.6v10.8A3.6 3.6 0 0 0 6.6 21h10.8A3.6 3.6 0 0 0 21 17.4V6.6A3.6 3.6 0 0 0 17.4 3zm1.8 14.4a1.8 1.8 0 0 1-1.8 1.8H6.6a1.8 1.8 0 0 1-1.8-1.8V6.6A1.8 1.8 0 0 1 6.6 4.8h10.8a1.8 1.8 0 0 1 1.8 1.8z"
      />
    </svg>
  ),

  telegram: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20.9 3.6c.6-.2 1.2.4 1 .9l-3.2 15.3c-.1.6-.8.9-1.3.6l-4.6-3.4-2.2 2.2c-.4.4-1.1.1-1.1-.5v-3.6l7.8-7.4c.3-.3 0-.8-.4-.6l-9.7 6.1-3.8-1.2c-.6-.2-.6-1.1 0-1.3z"
      />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.6 7.1a3 3 0 0 0-2.1-2.1C17.6 4.5 12 4.5 12 4.5s-5.6 0-7.5.5a3 3 0 0 0-2.1 2.1A31.8 31.8 0 0 0 2 12a31.8 31.8 0 0 0 .4 4.9 3 3 0 0 0 2.1 2.1c1.9.5 7.5.5 7.5.5s5.6 0 7.5-.5a3 3 0 0 0 2.1-2.1A31.8 31.8 0 0 0 22 12a31.8 31.8 0 0 0-.4-4.9zM10.2 15.5V8.5L15.8 12z"
      />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.5 3c.5 2.1 2 3.6 4 3.9v3.2c-1.6.1-3.1-.4-4.3-1.3v5.5c0 3.1-2.6 5.7-5.8 5.7-3.2 0-5.8-2.6-5.8-5.7 0-3.1 2.6-5.6 5.8-5.6.4 0 .7 0 1.1.1v3.3c-.3-.1-.7-.2-1.1-.2-1.3 0-2.4 1-2.4 2.4 0 1.3 1.1 2.4 2.4 2.4s2.5-1.1 2.5-2.4V3h3.6z"
      />
    </svg>
  ),
  link: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M10.6 13.4a1 1 0 0 1 0-1.4l2.9-2.9a1 1 0 1 1 1.4 1.4l-2.9 2.9a1 1 0 0 1-1.4 0zm-2.8 2.8a3.5 3.5 0 0 1 0-5l2-2a3.5 3.5 0 0 1 5 0 1 1 0 1 1-1.4 1.4 1.5 1.5 0 0 0-2.2 0l-2 2a1.5 1.5 0 1 0 2.2 2.2l.4-.4a1 1 0 1 1 1.4 1.4l-.4.4a3.5 3.5 0 0 1-5 0zm6.6-8.6a3.5 3.5 0 0 1 5 0 3.5 3.5 0 0 1 0 5l-2 2a3.5 3.5 0 0 1-5 0 1 1 0 0 1 1.4-1.4 1.5 1.5 0 0 0 2.2 0l2-2a1.5 1.5 0 0 0-2.2-2.2l-.4.4a1 1 0 1 1-1.4-1.4l.4-.4z"
      />
    </svg>
  ),
};

const normalizeLinks = (links: HomeContent['socialLinks']) =>
  links
    .filter((link) => link && link.label && link.href)
    .map((link) => ({
      ...link,
      icon: link.icon || 'link',
    }));

export default function Footer() {
  const [links, setLinks] = useState<HomeContent['socialLinks']>(
    DEFAULT_HOME_CONTENT.socialLinks
  );

  useEffect(() => {
    let active = true;
    publicService
      .getHomeContent()
      .then((res) => {
        if (!active) return;
        const content = mergeHomeContent(DEFAULT_HOME_CONTENT, res.data?.content);
        setLinks(content.socialLinks || []);
      })
      .catch(() => {
        if (!active) return;
        setLinks(DEFAULT_HOME_CONTENT.socialLinks);
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleLinks = useMemo(() => normalizeLinks(links), [links]);


  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">JobPost</div>
          <p className="footer-tagline">
            Modern hiring and talent discovery, curated for ambitious teams.
          </p>
        </div>
        {visibleLinks.length > 0 && (
          <div className="footer-social" aria-label="JobPost social links">
            {visibleLinks.map((link, index) => {
              const icon = Icons[link.icon] || Icons.link;
              return (
                <a
                  key={`${link.label}-${index}`}
                  className="social-link"
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={link.label}
                  title={link.label}
                >
                  {icon}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </footer>
  );
}
