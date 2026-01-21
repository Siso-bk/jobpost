import './globals.css';
import React from 'react';
import Header from '../components/Header';

export const metadata = {
  title: 'JobPost',
  description: 'Job posting platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
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
