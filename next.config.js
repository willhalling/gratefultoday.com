/** @type {import('next').NextConfig} */

// Everything from the old site (sobriety chips and cards, thank-you cards, the
// wall, blog, newsletter, quotes) is gone. Old URLs go to the home page so
// indexed pages and links people already shared don't 404.
const OLD_SECTIONS = [
  'thank-you-cards',
  'card',
  'c',
  'shared',
  'sobriety-chips',
  'sobriety-cards',
  'sobriety-counter',
  'wall',
  'blog',
  'affirmations',
  'quotes',
  'newsletter',
  'about',
  'support',
  'contact',
  'privacy',
  'terms',
  'email-video',
  'just-for-a-week',
  'just-for-today',
  'sign-in',
  'brand-test',
];

const nextConfig = {
  // The advisor reads the knowledge base at runtime, so ship it with its routes.
  outputFileTracingIncludes: {
    '/api/advisor': ['./knowledge/chunks.jsonl'],
    '/api/advisor/saved': ['./knowledge/chunks.jsonl'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
    ],
  },
  async redirects() {
    return [
      ...OLD_SECTIONS.flatMap((s) => [
        { source: `/${s}`, destination: '/', permanent: true },
        { source: `/${s}/:path*`, destination: '/', permanent: true },
      ]),
      { source: '/quotes.html', destination: '/', permanent: true },
    ];
  },
};

module.exports = nextConfig;
