/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Keep config minimal like slowedgenerator; rely on workspace resolution
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'funeralcollage.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'v3.fal.media',
      },
      {
        protocol: 'https',
        hostname: 'staging.funeralcollage.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
      },
    ],
    disableStaticImages: false,
  },
  async redirects() {
    return [
      {
        source: '/quotes.html',
        destination: '/quotes',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
