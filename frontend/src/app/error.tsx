'use client';
import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page-container error-page">
      <div className="card error-card">
        <div className="eyebrow">500</div>
        <h1>Something went wrong</h1>
        <p className="muted">We hit a snag. Try again or return to a safe page.</p>
        <div className="error-actions">
          <button type="button" className="btn-primary" onClick={reset}>
            Try again
          </button>
          <Link className="btn-secondary" href="/jobs">
            Go to jobs
          </Link>
        </div>
      </div>
    </div>
  );
}
