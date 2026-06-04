import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Brand Resources s | GratefulToday',
  description: 'Internal brand resources and guidelines for GratefulToday content creation.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function BrandIndexPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-serif text-gray-800 mb-4">
          GratefulToday Brand Resources
        </h1>
        <p className="text-lg text-gray-600 mb-12">
          Internal guidelines and resources for creating consistent, authentic content.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Brand Guidelines Card */}
          <Link
            href="/brand/guidelines"
            className="group bg-white p-8 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <svg
                  className="w-8 h-8 text-green-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                  />
                </svg>
              </div>
              <svg
                className="w-6 h-6 text-gray-400 group-hover:text-gray-600 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-serif text-gray-800 mb-3">Brand Guidelines</h2>
            <p className="text-gray-600 mb-4">
              Complete brand guidelines including color palette, typography, visual style, tone of
              voice, and healing frequencies.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">Colors</span>
              <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                Typography
              </span>
              <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                Visual Style
              </span>
              <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">Audio/Hz</span>
            </div>
          </Link>

          {/* YouTube Guidelines Card */}
          <Link
            href="/brand/youtube-guidelines"
            className="group bg-white p-8 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-red-100 p-3 rounded-lg">
                <svg className="w-8 h-8 text-red-700" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </div>
              <svg
                className="w-6 h-6 text-gray-400 group-hover:text-gray-600 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-serif text-gray-800 mb-3">YouTube Posting Guidelines</h2>
            <p className="text-gray-600 mb-4">
              Weekly posting schedule, title formats, description templates, and pre-post checklist
              for consistent YouTube content.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded">
                Weekly Schedule
              </span>
              <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded">Titles</span>
              <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded">Descriptions</span>
              <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded">Checklist</span>
            </div>
          </Link>

          {/* Midjourney Guidelines Card */}
          <Link
            href="/brand/midjourney-guidelines"
            className="group bg-white p-8 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <svg
                  className="w-8 h-8 text-purple-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <svg
                className="w-6 h-6 text-gray-400 group-hover:text-gray-600 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-serif text-gray-800 mb-3">Midjourney Guidelines</h2>
            <p className="text-gray-600 mb-4">
              AI image generation prompts and examples for creating on-brand imagery, thumbnails,
              and visual content.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                Prompts
              </span>
              <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                Examples
              </span>
              <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                Parameters
              </span>
              <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">Tips</span>
            </div>
          </Link>

          {/* Suno Guidelines Card */}
          <Link
            href="/brand/suno-guidelines"
            className="group bg-white p-8 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <svg
                  className="w-8 h-8 text-blue-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
              </div>
              <svg
                className="w-6 h-6 text-gray-400 group-hover:text-gray-600 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-serif text-gray-800 mb-3">Suno AI Guidelines</h2>
            <p className="text-gray-600 mb-4">
              Music generation prompts for healing frequencies and meditation tracks. Includes
              slowed + reverb section.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">Prompts</span>
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                Frequencies
              </span>
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                Instruments
              </span>
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                Slowed+Reverb
              </span>
            </div>
          </Link>

          {/* YouTube Example Card */}
          <Link
            href="/brand/youtube-example"
            className="group bg-white p-8 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-amber-100 p-3 rounded-lg">
                <svg
                  className="w-8 h-8 text-amber-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <svg
                className="w-6 h-6 text-gray-400 group-hover:text-gray-600 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-serif text-gray-800 mb-3">YouTube Post Example</h2>
            <p className="text-gray-600 mb-4">
              Complete example: &quot;3am early sobriety can&apos;t sleep&quot; - title, thumbnail,
              description, tags, playlists, and publishing checklist.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded">Title</span>
              <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded">
                Thumbnail
              </span>
              <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded">
                Description
              </span>
              <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded">
                Checklist
              </span>
            </div>
          </Link>
        </div>

        {/* Core Principle Section */}
        <div className="mt-12 bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 p-8 rounded-lg">
          <h2 className="text-3xl font-serif text-gray-800 mb-6">
            Core Principle for GratefulToday
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">The Foundation</h3>
              <p className="text-lg text-gray-700 italic">
                &quot;Finding peace in the present, one grateful moment at a time.&quot;
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">What We Stand For</h3>
              <p className="text-gray-700 mb-2">
                Sobriety isn&apos;t about what you gave up - it&apos;s about what you gained back.
              </p>
              <p className="text-gray-700 mb-2">We create calm spaces for people in recovery to:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li>Find gratitude in small things</li>
                <li>Accept things as they are</li>
                <li>Stay present, one day at a time</li>
                <li>Remember they&apos;re not alone</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Our Promise</h3>
              <p className="text-gray-700">
                Authentic over perfect. Consistent over viral. Helpful over popular.
              </p>
              <p className="text-gray-700 mt-2">
                We show up regularly - not because we have it all figured out, but because
                we&apos;re all figuring it out together.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">The GratefulToday Way</h3>
              <p className="text-gray-700 mb-2">
                <strong>We believe:</strong>
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4 mb-3">
                <li>Recovery happens in quiet moments, not grand gestures</li>
                <li>Gratitude is a practice, not a feeling</li>
                <li>Nature and peace are always available to us</li>
                <li>Sobriety is something to be grateful for every single day</li>
                <li>Community heals in ways we can&apos;t do alone</li>
              </ul>
              <p className="text-gray-700 mb-2">
                <strong>We create content that:</strong>
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li>Helps at 3am when you can&apos;t sleep</li>
                <li>Supports you when cravings hit</li>
                <li>Reminds you what you&apos;re grateful for</li>
                <li>Gives you permission to just breathe</li>
                <li>Feels like a trusted friend, not a guru</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Our Voice</h3>
              <p className="text-gray-700">
                Honest, never preachy. Calm, never forced. Real, never polished.
              </p>
              <p className="text-gray-700 mt-2">
                We share the journey - the hard days and the hopeful ones - because that&apos;s what
                recovery actually looks like.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Why We Exist</h3>
              <p className="text-gray-700 mb-2">
                Not to motivate you. Not to fix you. Not to sell you something.
              </p>
              <p className="text-gray-700 mb-2">To remind you:</p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li>You woke up sober today (that&apos;s enough)</li>
                <li>Nature is still there</li>
                <li>Small things still matter</li>
                <li>You&apos;re doing better than you think</li>
                <li>There&apos;s always something to be grateful for</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">The Feeling We Create</h3>
              <p className="text-gray-700 mb-2">
                When someone finds GratefulToday, they should feel:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                <li>Safe</li>
                <li>Understood</li>
                <li>Not alone</li>
                <li>Like they can breathe</li>
                <li>Grateful they&apos;re here</li>
              </ul>
            </div>

            <div className="pt-4 border-t-2 border-green-300">
              <p className="text-xl text-gray-700 italic text-center">
                &quot;Grateful to be here, grateful to be sober, grateful for this moment.&quot;
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
            <div className="text-3xl font-bold text-green-700 mb-1">3-4x</div>
            <div className="text-sm text-gray-600">Posts per week</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
            <div className="text-3xl font-bold text-green-700 mb-1">24hr</div>
            <div className="text-sm text-gray-600">Comment reply time</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
            <div className="text-3xl font-bold text-green-700 mb-1">5</div>
            <div className="text-sm text-gray-600">Hz frequencies</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
            <div className="text-3xl font-bold text-green-700 mb-1">100%</div>
            <div className="text-sm text-gray-600">Authentic</div>
          </div>
        </div>

        {/* Note */}
        <div className="mt-8 bg-amber-50 border-l-4 border-amber-400 p-4 rounded">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> These pages are for internal use only and are not indexed by
            search engines.
          </p>
        </div>
      </div>
    </div>
  );
}
