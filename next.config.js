/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['api-prod.strike.money', 'api-prod-v21.strike.money'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://api-prod-v21.strike.money/v2/api/:path*',
      },
    ];
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api-prod-v21.strike.money/v2/api',
  },
};

module.exports = nextConfig;
