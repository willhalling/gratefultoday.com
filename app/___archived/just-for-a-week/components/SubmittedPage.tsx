import Link from 'next/link';

interface SubmittedPageProps {
  day: number;
}

export default function SubmittedPage({ day }: SubmittedPageProps) {
  const isLastDay = day === 7;

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 text-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
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

          <h1 className="text-3xl font-bold text-neutral-900 mb-4">
            Day {day} Complete
          </h1>

          <p className="text-lg text-neutral-600 mb-8">
            {isLastDay
              ? "You've completed all 7 days! Your journey video is being created."
              : `Your response has been saved. Check your email tomorrow for Day ${day + 1}.`}
          </p>

          <div className="bg-primary-50 rounded-lg p-6 mb-8">
            <p className="text-neutral-800">
              <strong>What's next?</strong>
            </p>
            <p className="text-neutral-600 mt-2">
              {isLastDay
                ? "We'll email you your personalized journey video within 24 hours."
                : `We'll send you Day ${day + 1} tomorrow. Take a moment to notice how you feel right now.`}
            </p>
          </div>

          <Link
            href="/"
            className="inline-block bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
