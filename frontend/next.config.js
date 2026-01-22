/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
