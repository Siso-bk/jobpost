import './globals.css';
import React from 'react';
import Header from '../components/Header';

export const metadata = {
  title: 'JobPost',
  description: 'Job posting platform',
  icons: {
    icon: [
      { url: '/jobpost-logo/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/jobpost-logo/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/jobpost-logo/app-icon-1024.png', sizes: '1024x1024', type: 'image/png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Sora:wght@300;400;500;600&display=swap"
        />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(() => {
  try {
    const t = localStorage.getItem('theme');
    if (t) {
      document.documentElement.dataset.theme = t;
      return;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.dataset.theme = 'dark';
    }
  } catch {}
})();`,
          }}
        />
        <Header />
        {children}
      </body>
    </html>
  );
}
