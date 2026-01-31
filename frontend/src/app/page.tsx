import Link from 'next/link';
import { DEFAULT_HOME_CONTENT, mergeHomeContent, type HomeContent } from '@/lib/homeContent';

export const dynamic = 'force-dynamic';

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_API_URL ||
  'http://localhost:5000/api'
).replace(/\/$/, '');

async function getHomeContent(): Promise<HomeContent> {
  try {
    const res = await fetch(`${API_BASE}/public/home`, { cache: 'no-store' });
    if (!res.ok) return DEFAULT_HOME_CONTENT;
    const data = await res.json().catch(() => ({}));
    return mergeHomeContent(DEFAULT_HOME_CONTENT, data?.content);
  } catch {
    return DEFAULT_HOME_CONTENT;
  }
}

export default async function HomePage() {
  const content = await getHomeContent();

  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">{content.hero.eyebrow}</div>
            <h1>{content.hero.title}</h1>
            <p>{content.hero.description}</p>
            <div className="hero-actions">
              <Link className="btn-primary" href={content.hero.primaryCta.href}>
                {content.hero.primaryCta.label}
              </Link>
              <Link className="btn-secondary" href={content.hero.secondaryCta.href}>
                {content.hero.secondaryCta.label}
              </Link>
            </div>
            <div className="hero-metrics">
              {content.metrics.map((metric) => (
                <div key={metric.label}>
                  <div className="metric">{metric.value}</div>
                  <span className="muted">{metric.label}</span>
                </div>
              ))}
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
            {content.logos.map((logo) => (
              <span key={logo}>{logo}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="container">
          <div className="section-head">
            <h2>{content.featureSection.title}</h2>
            <p className="muted">{content.featureSection.description}</p>
          </div>
          <div className="feature-grid">
            {content.featureSection.features.map((feature) => (
              <div className="feature-card" key={feature.title}>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section soft">
        <div className="container steps">
          <div>
            <div className="eyebrow">{content.stepsSection.eyebrow}</div>
            <h2>{content.stepsSection.title}</h2>
          </div>
          <div className="step-grid">
            {content.stepsSection.steps.map((step) => (
              <div className="step-card" key={step.number}>
                <span className="step-num">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div className="container cta-card">
          <div>
            <h2>{content.cta.title}</h2>
            <p className="muted">{content.cta.description}</p>
          </div>
          <div className="hero-actions">
            <Link className="btn-primary" href={content.cta.primaryCta.href}>
              {content.cta.primaryCta.label}
            </Link>
            <Link className="btn-secondary" href={content.cta.secondaryCta.href}>
              {content.cta.secondaryCta.label}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
