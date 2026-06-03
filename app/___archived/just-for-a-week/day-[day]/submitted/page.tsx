import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Response Saved | Just For a Week',
  description: 'Your response has been saved.',
};

export default function SubmittedPage({ params }: { params: { day: string } }) {
  const day = parseInt(params.day);

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-neutral-900 mb-4">Day {day} Complete</h1>

          <p className="text-lg text-neutral-600 mb-8">Your response has been saved.</p>

          <div className="bg-primary-50 rounded-lg p-6 mb-8">
            <p className="text-neutral-800">
              <strong>What's next?</strong>
            </p>
            <p className="text-neutral-600 mt-2">
              We'll send you Day {day + 1} tomorrow. Take a moment to notice how you feel right now.
            </p>
          </div>

          <Link
            href="/just-for-a-week"
            className="inline-block bg-neutral-800 text-white px-8 py-3 rounded-lg hover:bg-neutral-700 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
