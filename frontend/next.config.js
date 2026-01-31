/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    // Proxy backend API calls, but let other Next API routes win first.
    // On Vercel, set API_PROXY_TARGET or NEXT_PUBLIC_API_URL to your backend: https://<render>.onrender.com/api
    const rawBase =
      process.env.API_PROXY_TARGET ||
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.BACKEND_API_URL ||
      'http://localhost:5000/api';
    const trimmed = rawBase.replace(/\/$/, '');
    const base = trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
    const dest = `${base}/:path*`;
    return {
      fallback: [
        {
          source: '/api/:path*',
          destination: dest,
        },
      ],
    };
  },
};

module.exports = nextConfig;
