export type HomeContent = {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
  };
  metrics: { value: string; label: string }[];
  logos: string[];
  featureSection: {
    title: string;
    description: string;
    features: { title: string; description: string }[];
  };
  stepsSection: {
    eyebrow: string;
    title: string;
    steps: { number: string; title: string; description: string }[];
  };
  cta: {
    title: string;
    description: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
  };
};

export const DEFAULT_HOME_CONTENT: HomeContent = {
  hero: {
    eyebrow: 'JobPost',
    title: 'Hire and get hired with a modern job board.',
    description:
      'Source high-signal roles, manage applicants, and connect with teams that fit your goals. JobPost keeps the process fast, clear, and human.',
    primaryCta: { label: 'Explore jobs', href: '/jobs' },
    secondaryCta: { label: 'Post a role', href: '/post-job' },
  },
  metrics: [
    { value: '5.2k+', label: 'roles live' },
    { value: '1.8k', label: 'hiring teams' },
    { value: '48h', label: 'avg time to interview' },
  ],
  logos: ['Polarite', 'Bluepine', 'Arcward', 'Monarch', 'Helio'],
  featureSection: {
    title: 'Everything you need to hire with confidence.',
    description: 'JobPost pairs clean listings with applicant workflows that feel effortless.',
    features: [
      {
        title: 'Curated search',
        description:
          'Filter by role, location, and job type. Save the searches that matter and return fast.',
      },
      {
        title: 'Applicant ready',
        description:
          'Structured roles, clear salary bands, and fast application flows keep the funnel moving.',
      },
      {
        title: 'Built for speed',
        description:
          'Modern tech and smart caching keep every page responsive and production ready.',
      },
    ],
  },
  stepsSection: {
    eyebrow: 'How it works',
    title: 'Launch your next hire in three simple steps.',
    steps: [
      {
        number: '01',
        title: 'Create the role',
        description: 'Post polished listings with structured job details and salary clarity.',
      },
      {
        number: '02',
        title: 'Review applicants',
        description: 'Track applications, keep notes, and move candidates fast.',
      },
      {
        number: '03',
        title: 'Hire with confidence',
        description: 'Bring the right people on board, with less noise and more signal.',
      },
    ],
  },
  cta: {
    title: 'Ready to upgrade your hiring flow?',
    description: 'Start with a featured listing or browse roles that match your skills.',
    primaryCta: { label: 'Create account', href: '/register' },
    secondaryCta: { label: 'Browse jobs', href: '/jobs' },
  },
};

export function mergeHomeContent(
  base: HomeContent,
  incoming?: Partial<HomeContent> | null
): HomeContent {
  if (!incoming || typeof incoming !== 'object') return base;

  const hero = {
    ...base.hero,
    ...(incoming.hero || {}),
    primaryCta: {
      ...base.hero.primaryCta,
      ...(incoming.hero?.primaryCta || {}),
    },
    secondaryCta: {
      ...base.hero.secondaryCta,
      ...(incoming.hero?.secondaryCta || {}),
    },
  };

  const metrics =
    Array.isArray(incoming.metrics) && incoming.metrics.length > 0
      ? incoming.metrics
      : base.metrics;

  const logos =
    Array.isArray(incoming.logos) && incoming.logos.length > 0 ? incoming.logos : base.logos;

  const featureSection = {
    ...base.featureSection,
    ...(incoming.featureSection || {}),
    features:
      Array.isArray(incoming.featureSection?.features) &&
      incoming.featureSection?.features.length > 0
        ? incoming.featureSection.features
        : base.featureSection.features,
  };

  const stepsSection = {
    ...base.stepsSection,
    ...(incoming.stepsSection || {}),
    steps:
      Array.isArray(incoming.stepsSection?.steps) && incoming.stepsSection.steps.length > 0
        ? incoming.stepsSection.steps
        : base.stepsSection.steps,
  };

  const cta = {
    ...base.cta,
    ...(incoming.cta || {}),
    primaryCta: {
      ...base.cta.primaryCta,
      ...(incoming.cta?.primaryCta || {}),
    },
    secondaryCta: {
      ...base.cta.secondaryCta,
      ...(incoming.cta?.secondaryCta || {}),
    },
  };

  return {
    hero,
    metrics,
    logos,
    featureSection,
    stepsSection,
    cta,
  };
}
