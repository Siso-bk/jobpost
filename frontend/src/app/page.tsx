import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">JobPost</div>
            <h1>Hire and get hired with a modern job board.</h1>
            <p>
              Source high-signal roles, manage applicants, and connect with teams that fit your
              goals. JobPost keeps the process fast, clear, and human.
            </p>
            <div className="hero-actions">
              <Link className="btn-primary" href="/jobs">
                Explore jobs
              </Link>
              <Link className="btn-secondary" href="/post-job">
                Post a role
              </Link>
            </div>
            <div className="hero-metrics">
              <div>
                <div className="metric">5.2k+</div>
                <span className="muted">roles live</span>
              </div>
              <div>
                <div className="metric">1.8k</div>
                <span className="muted">hiring teams</span>
              </div>
              <div>
                <div className="metric">48h</div>
                <span className="muted">avg time to interview</span>
              </div>
            </div>
          </div>
          <div className="hero-panel">
            <div className="hero-card">
              <div className="hero-card-head">
                <div className="hero-avatar">JP</div>
                <div>
                  <div className="hero-card-title">Lead Product Designer</div>
                  <div className="muted">Remote, North America</div>
                </div>
                <span className="badge badge-featured">Featured</span>
              </div>
              <div className="hero-card-body">
                <div className="pill">Full Time</div>
                <div className="pill">$110k - $145k USD</div>
                <p className="muted">
                  Own the experience for a fast-growing AI productivity suite. Portfolio required.
                </p>
              </div>
            </div>
            <div className="hero-card accent">
              <div className="hero-card-head">
                <div className="hero-avatar">GL</div>
                <div>
                  <div className="hero-card-title">Growth Marketing Manager</div>
                  <div className="muted">Hybrid, Berlin</div>
                </div>
              </div>
              <div className="hero-card-body">
                <div className="pill">Contract</div>
                <div className="pill">$6k - $8k EUR</div>
                <p className="muted">
                  Scale lifecycle and paid channels with a lean team that ships weekly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="logo-cloud">
        <div className="container">
          <p className="muted">Trusted by teams building the future of work</p>
          <div className="logo-row">
            <span>Polarite</span>
            <span>Bluepine</span>
            <span>Arcward</span>
            <span>Monarch</span>
            <span>Helio</span>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="container">
          <div className="section-head">
            <h2>Everything you need to hire with confidence.</h2>
            <p className="muted">
              JobPost pairs clean listings with applicant workflows that feel effortless.
            </p>
          </div>
          <div className="feature-grid">
            <div className="feature-card">
              <h3>Curated search</h3>
              <p>
                Filter by role, location, and job type. Save the searches that matter and return
                fast.
              </p>
            </div>
            <div className="feature-card">
              <h3>Applicant ready</h3>
              <p>
                Structured roles, clear salary bands, and fast application flows keep the funnel
                moving.
              </p>
            </div>
            <div className="feature-card">
              <h3>Built for speed</h3>
              <p>Modern tech and smart caching keep every page responsive and production ready.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section soft">
        <div className="container steps">
          <div>
            <div className="eyebrow">How it works</div>
            <h2>Launch your next hire in three simple steps.</h2>
          </div>
          <div className="step-grid">
            <div className="step-card">
              <span className="step-num">01</span>
              <h3>Create the role</h3>
              <p>Post polished listings with structured job details and salary clarity.</p>
            </div>
            <div className="step-card">
              <span className="step-num">02</span>
              <h3>Review applicants</h3>
              <p>Track applications, keep notes, and move candidates fast.</p>
            </div>
            <div className="step-card">
              <span className="step-num">03</span>
              <h3>Hire with confidence</h3>
              <p>Bring the right people on board, with less noise and more signal.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div className="container cta-card">
          <div>
            <h2>Ready to upgrade your hiring flow?</h2>
            <p className="muted">
              Start with a featured listing or browse roles that match your skills.
            </p>
          </div>
          <div className="hero-actions">
            <Link className="btn-primary" href="/register">
              Create account
            </Link>
            <Link className="btn-secondary" href="/jobs">
              Browse jobs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
