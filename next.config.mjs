/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8082',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8082',
        pathname: '/skills-upload/**',
      },
      {
        protocol: 'https',
        hostname: 'serkanursavas.me',
        pathname: '/skills-upload/**',
      },
      {
        protocol: 'https',
        hostname: 'serkanursavas.me',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '**', // Allow all HTTPS hostnames for development
      },
    ],
    minimumCacheTTL: 0, // Disable image cache for development
  },
};

export default nextConfig;
