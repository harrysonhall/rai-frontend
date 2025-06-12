/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3002/api/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: 'http://localhost:3002/socket.io/:path*',
      },
    ]
  }
};

module.exports = nextConfig;