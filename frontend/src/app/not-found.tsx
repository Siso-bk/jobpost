import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="page-container error-page">
      <div className="card error-card">
        <div className="eyebrow">404</div>
        <h1>Page not found</h1>
        <p className="muted">The page you are looking for does not exist or has moved.</p>
        <div className="error-actions">
          <Link className="btn-primary" href="/jobs">
            Go to jobs
          </Link>
          <Link className="btn-secondary" href="/">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
