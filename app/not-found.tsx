import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-green-50 to-brand-amber-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-brand-green-700 mb-2">404</h1>
          <h2 className="text-3xl font-semibold text-brand-amber-800 mb-4">
            Page Not Found
          </h2>
          <p className="text-gray-700 text-lg mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <Link
          href="/"
          className="inline-block bg-brand-green-700 hover:bg-brand-green-800 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
        >
          Go Home
        </Link>

        <div className="mt-12 text-sm text-gray-600">
          <p>What are you grateful for today?</p>
        </div>
      </div>
    </div>
  );
}
