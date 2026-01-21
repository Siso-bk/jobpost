/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Proxy backend API calls, but let Next API routes (e.g. /api/personalai/*) win first.
    // On Vercel, set API_PROXY_TARGET or NEXT_PUBLIC_API_URL to your backend: https://<render>.onrender.com/api
    const base =
      process.env.API_PROXY_TARGET ||
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.BACKEND_API_URL ||
      'http://localhost:5000/api';
    const dest = `${base.replace(/\/$/, '')}/:path*`;
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
