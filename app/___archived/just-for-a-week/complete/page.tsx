import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Journey Complete | Just For a Week',
  description: 'Your 7-day gratitude journey is complete.',
};

export default function CompletePage() {
  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 text-center">
          <div className="mb-8">
            <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-12 h-12 text-white"
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
            
            <h1 className="text-4xl font-bold text-neutral-900 mb-4">
              7 Days Complete
            </h1>
            
            <p className="text-xl text-neutral-600 mb-8">
              You showed up. You noticed. You wrote.
            </p>
          </div>

          <div className="bg-primary-50 rounded-lg p-6 mb-8">
            <p className="text-lg text-neutral-800 mb-2">
              <strong>Your journey video is being created</strong>
            </p>
            <p className="text-neutral-600">
              We're compiling all your responses into a personal video. You'll receive it by email within 24 hours.
            </p>
          </div>

          <div className="space-y-4 text-left mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">What happens next?</h2>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                1
              </div>
              <div>
                <p className="font-semibold text-neutral-900">Video Generation</p>
                <p className="text-neutral-600">
                  We're creating a personalized video of your 7-day journey
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                2
              </div>
              <div>
                <p className="font-semibold text-neutral-900">Email Delivery</p>
                <p className="text-neutral-600">
                  You'll receive your video by email within 24 hours
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                3
              </div>
              <div>
                <p className="font-semibold text-neutral-900">Keep Going</p>
                <p className="text-neutral-600">
                  This is just the beginning. Gratitude is a practice, not a destination.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-neutral-200">
            <p className="text-sm text-neutral-500 italic">
              Thank you for showing up. For noticing. For trying.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
