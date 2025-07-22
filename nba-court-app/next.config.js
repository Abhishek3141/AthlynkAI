/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async rewrites() {
    return [
      {
        source: '/api/nba/:path*',
        destination: 'http://localhost:5001/api/nba/:path*'
      }
    ];
  }
};

module.exports = nextConfig;