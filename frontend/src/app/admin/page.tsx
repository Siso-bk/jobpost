'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminService, authService } from '@/services/api';
import { DEFAULT_HOME_CONTENT, mergeHomeContent, type HomeContent } from '@/lib/homeContent';
import { friendlyError } from '@/lib/feedback';

export default function AdminDashboardPage() {
  const [form, setForm] = useState<HomeContent>(DEFAULT_HOME_CONTENT);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    let active = true;
    authService
      .me()
      .then((res) => {
        if (!active) return;
        if (!res.data?.id) {
          setError('Please sign in with an admin account to continue.');
        }
      })
      .catch(() => {
        if (!active) return;
        setError('Please sign in with an admin account to continue.');
      });
    return () => {
      active = false;
    };
  }, []);

  const loadHome = async () => {
    setLoading(true);
    setError('');
    setStatus('');
    try {
      const res = await adminService.getHomeContent();
      setForm(mergeHomeContent(DEFAULT_HOME_CONTENT, res.data?.content));
      setStatus('Home page content loaded.');
    } catch (err: any) {
      setError(friendlyError(err, 'We could not load the home page content. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHome();
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setStatus('Saving changes...');
    try {
      await adminService.updateHomeContent(form);
      setStatus('Home page updated successfully.');
    } catch (err: any) {
      setStatus('');
      setError(friendlyError(err, 'We could not update the home page. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const updateHero = (field: keyof HomeContent['hero'], value: string) => {
    setForm((prev) => ({
      ...prev,
      hero: { ...prev.hero, [field]: value }
    }));
  };

  const updateHeroCta = (field: 'primaryCta' | 'secondaryCta', key: 'label' | 'href', value: string) => {
    setForm((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        [field]: { ...prev.hero[field], [key]: value }
      }
    }));
  };

  const updateMetric = (index: number, key: 'value' | 'label', value: string) => {
    setForm((prev) => {
      const metrics = [...prev.metrics];
      metrics[index] = { ...metrics[index], [key]: value };
      return { ...prev, metrics };
    });
  };

  const updateLogo = (index: number, value: string) => {
    setForm((prev) => {
      const logos = [...prev.logos];
      logos[index] = value;
      return { ...prev, logos };
    });
  };

  const updateFeature = (index: number, key: 'title' | 'description', value: string) => {
    setForm((prev) => {
      const features = [...prev.featureSection.features];
      features[index] = { ...features[index], [key]: value };
      return { ...prev, featureSection: { ...prev.featureSection, features } };
    });
  };

  const updateFeatureSection = (key: 'title' | 'description', value: string) => {
    setForm((prev) => ({
      ...prev,
      featureSection: { ...prev.featureSection, [key]: value }
    }));
  };

  const updateStepSection = (key: 'eyebrow' | 'title', value: string) => {
    setForm((prev) => ({
      ...prev,
      stepsSection: { ...prev.stepsSection, [key]: value }
    }));
  };

  const updateStep = (index: number, key: 'number' | 'title' | 'description', value: string) => {
    setForm((prev) => {
      const steps = [...prev.stepsSection.steps];
      steps[index] = { ...steps[index], [key]: value };
      return { ...prev, stepsSection: { ...prev.stepsSection, steps } };
    });
  };

  const updateCta = (key: keyof HomeContent['cta'], value: string) => {
    setForm((prev) => ({
      ...prev,
      cta: { ...prev.cta, [key]: value }
    }));
  };

  const updateCtaLink = (field: 'primaryCta' | 'secondaryCta', key: 'label' | 'href', value: string) => {
    setForm((prev) => ({
      ...prev,
      cta: {
        ...prev.cta,
        [field]: { ...prev.cta[field], [key]: value }
      }
    }));
  };

  return (
    <div className="page-container admin-page">
      <div className="applications-header">
        <div>
          <div className="eyebrow">Admin</div>
          <h1>Dashboard</h1>
          <p className="muted">
            Update the JobPost home page, review moderation, and keep the platform on brand.
          </p>
        </div>
        <div className="hero-actions">
          <button type="button" className="btn-secondary" onClick={loadHome} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh content'}
          </button>
          <Link className="btn-ghost" href="/moderation">
            Moderation
          </Link>
        </div>
      </div>

      {status && <p className="status-message">{status}</p>}
      {error && <p className="error-message">{error}</p>}

      <form className="form-card" onSubmit={handleSave}>
        <h2>Home page editor</h2>
        <p className="muted">
          Changes go live immediately for new visitors. Keep copy concise and on-brand.
        </p>

        <div className="form-grid">
          <label>
            <span>Hero eyebrow</span>
            <input
              value={form.hero.eyebrow}
              onChange={(event) => updateHero('eyebrow', event.target.value)}
            />
          </label>
          <label>
            <span>Hero title</span>
            <input
              value={form.hero.title}
              onChange={(event) => updateHero('title', event.target.value)}
            />
          </label>
          <label>
            <span>Hero description</span>
            <textarea
              value={form.hero.description}
              onChange={(event) => updateHero('description', event.target.value)}
            />
          </label>
        </div>

        <div className="form-grid">
          <label>
            <span>Primary CTA label</span>
            <input
              value={form.hero.primaryCta.label}
              onChange={(event) => updateHeroCta('primaryCta', 'label', event.target.value)}
            />
          </label>
          <label>
            <span>Primary CTA link</span>
            <input
              value={form.hero.primaryCta.href}
              onChange={(event) => updateHeroCta('primaryCta', 'href', event.target.value)}
            />
          </label>
          <label>
            <span>Secondary CTA label</span>
            <input
              value={form.hero.secondaryCta.label}
              onChange={(event) => updateHeroCta('secondaryCta', 'label', event.target.value)}
            />
          </label>
          <label>
            <span>Secondary CTA link</span>
            <input
              value={form.hero.secondaryCta.href}
              onChange={(event) => updateHeroCta('secondaryCta', 'href', event.target.value)}
            />
          </label>
        </div>

        <div className="form-grid">
          {form.metrics.map((metric, index) => (
            <label key={`metric-${index}`}>
              <span>Metric {index + 1}</span>
              <input
                value={metric.value}
                onChange={(event) => updateMetric(index, 'value', event.target.value)}
                placeholder="Value"
              />
              <input
                value={metric.label}
                onChange={(event) => updateMetric(index, 'label', event.target.value)}
                placeholder="Label"
              />
            </label>
          ))}
        </div>

        <div className="form-grid">
          {form.logos.map((logo, index) => (
            <label key={`logo-${index}`}>
              <span>Logo {index + 1}</span>
              <input
                value={logo}
                onChange={(event) => updateLogo(index, event.target.value)}
              />
            </label>
          ))}
        </div>

        <div className="form-grid">
          <label>
            <span>Feature section title</span>
            <input
              value={form.featureSection.title}
              onChange={(event) => updateFeatureSection('title', event.target.value)}
            />
          </label>
          <label>
            <span>Feature section description</span>
            <textarea
              value={form.featureSection.description}
              onChange={(event) => updateFeatureSection('description', event.target.value)}
            />
          </label>
        </div>

        <div className="form-grid">
          {form.featureSection.features.map((feature, index) => (
            <label key={`feature-${index}`}>
              <span>Feature {index + 1}</span>
              <input
                value={feature.title}
                onChange={(event) => updateFeature(index, 'title', event.target.value)}
                placeholder="Title"
              />
              <textarea
                value={feature.description}
                onChange={(event) => updateFeature(index, 'description', event.target.value)}
                placeholder="Description"
              />
            </label>
          ))}
        </div>

        <div className="form-grid">
          <label>
            <span>Steps eyebrow</span>
            <input
              value={form.stepsSection.eyebrow}
              onChange={(event) => updateStepSection('eyebrow', event.target.value)}
            />
          </label>
          <label>
            <span>Steps title</span>
            <input
              value={form.stepsSection.title}
              onChange={(event) => updateStepSection('title', event.target.value)}
            />
          </label>
        </div>

        <div className="form-grid">
          {form.stepsSection.steps.map((step, index) => (
            <label key={`step-${index}`}>
              <span>Step {index + 1}</span>
              <input
                value={step.number}
                onChange={(event) => updateStep(index, 'number', event.target.value)}
                placeholder="01"
              />
              <input
                value={step.title}
                onChange={(event) => updateStep(index, 'title', event.target.value)}
                placeholder="Title"
              />
              <textarea
                value={step.description}
                onChange={(event) => updateStep(index, 'description', event.target.value)}
                placeholder="Description"
              />
            </label>
          ))}
        </div>

        <div className="form-grid">
          <label>
            <span>CTA title</span>
            <input value={form.cta.title} onChange={(event) => updateCta('title', event.target.value)} />
          </label>
          <label>
            <span>CTA description</span>
            <textarea
              value={form.cta.description}
              onChange={(event) => updateCta('description', event.target.value)}
            />
          </label>
        </div>

        <div className="form-grid">
          <label>
            <span>CTA primary label</span>
            <input
              value={form.cta.primaryCta.label}
              onChange={(event) => updateCtaLink('primaryCta', 'label', event.target.value)}
            />
          </label>
          <label>
            <span>CTA primary link</span>
            <input
              value={form.cta.primaryCta.href}
              onChange={(event) => updateCtaLink('primaryCta', 'href', event.target.value)}
            />
          </label>
          <label>
            <span>CTA secondary label</span>
            <input
              value={form.cta.secondaryCta.label}
              onChange={(event) => updateCtaLink('secondaryCta', 'label', event.target.value)}
            />
          </label>
          <label>
            <span>CTA secondary link</span>
            <input
              value={form.cta.secondaryCta.href}
              onChange={(event) => updateCtaLink('secondaryCta', 'href', event.target.value)}
            />
          </label>
        </div>

        <div className="action-row">
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save home page'}
          </button>
          <Link className="btn-secondary" href="/">
            Preview home
          </Link>
        </div>
      </form>
    </div>
  );
}
