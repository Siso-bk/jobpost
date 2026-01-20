/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Server-side only: where to proxy API requests in production
    // On Vercel, set API_PROXY_TARGET to your Render backend: https://<render>.onrender.com/api
    const base = process.env.API_PROXY_TARGET || 'http://localhost:5000/api';
    const dest = `${base.replace(/\/$/, '')}/:path*`;
    return [
      {
        source: '/api/:path*',
        destination: dest,
      },
    ];
  },
};

module.exports = nextConfig;
