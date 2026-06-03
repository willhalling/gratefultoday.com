import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Terms & Conditions - Grateful Today',
    description: 'Terms and conditions for Grateful Today. Learn about our terms of service for gratitude and sobriety recovery tools.',
    metadataBase: new URL('https://gratefultoday.com')
  };
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-dark-forest">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-white mb-8">Terms & Conditions</h1>
        <div className="bg-forest-900/20 backdrop-blur-sm rounded-xl border border-forest-800 p-8">
          <div className="text-sm text-soft-sand-400 mb-6">
            Last updated: 15th October, 2025
          </div>
            
          <div className="prose prose-invert max-w-none text-soft-sand-200">
            <h2 className="text-2xl font-semibold text-white mb-4">Welcome to Grateful Today</h2>
            <p className="mb-6">
              By using Grateful Today, you agree to these terms. Our platform provides free tools and resources 
              to support gratitude practices and sobriety recovery journeys.
            </p>

            <h2 className="text-2xl font-semibold text-white mb-4">Acceptance of Terms</h2>
            <p className="mb-6">
              By accessing and using Grateful Today, you accept and agree to be bound by the terms and 
              provision of this agreement. These terms apply to all users of the site.
            </p>

            <h2 className="text-2xl font-semibold text-white mb-4">Use of Service</h2>
            <div className="bg-forest-800/30 border-l-4 border-forest-600 p-4 mb-6 rounded-r-lg">
              <h3 className="text-lg font-medium text-white mb-2">Permitted Use</h3>
              <ul className="list-disc list-inside text-soft-sand-200 space-y-1">
                <li>Access sobriety chip milestones and celebrations</li>
                <li>Use gratitude tools and daily affirmations</li>
                <li>Share your recovery journey with others</li>
                <li>Access quotes and inspirational content</li>
              </ul>
            </div>

            <h2 className="text-2xl font-semibold text-white mb-4">User Content</h2>
            <p className="mb-4">
              Any content you share or create on Grateful Today remains your property. However, by sharing 
              content publicly, you grant us a license to display and distribute that content on our platform.
            </p>

            <h2 className="text-2xl font-semibold text-white mb-4">Prohibited Activities</h2>
            <ul className="list-disc list-inside text-soft-sand-200 space-y-2 mb-6">
              <li>Using the service for any illegal or unauthorized purpose</li>
              <li>Sharing harmful, offensive, or inappropriate content</li>
              <li>Attempting to access unauthorized areas of the service</li>
              <li>Interfering with the security or functionality of the service</li>
            </ul>

            <h2 className="text-2xl font-semibold text-white mb-4">Privacy & Data</h2>
            <p className="mb-6">
              Your privacy is important to us. Please review our Privacy Policy to understand how we 
              collect, use, and protect your information.
            </p>

            <h2 className="text-2xl font-semibold text-white mb-4">Disclaimers</h2>
            <div className="bg-amber-900/20 border-l-4 border-amber-600 p-4 mb-6 rounded-r-lg">
              <p className="text-amber-200 mb-3">
                <strong>Recovery Support:</strong> Grateful Today provides tools and resources to support 
                your recovery journey, but is not a substitute for professional medical advice, therapy, 
                or treatment programs.
              </p>
              <p className="text-amber-200">
                Always consult with healthcare professionals regarding your recovery and mental health needs.
              </p>
            </div>

            <h2 className="text-2xl font-semibold text-white mb-4">Limitation of Liability</h2>
            <p className="mb-6">
              Grateful Today shall not be liable for any indirect, incidental, special, consequential, 
              or punitive damages resulting from your use of the service.
            </p>

            <h2 className="text-2xl font-semibold text-white mb-4">Changes to Terms</h2>
            <p className="mb-6">
              We reserve the right to modify these terms at any time. Changes will be posted on this page 
              with an updated revision date. Continued use of the service constitutes acceptance of modified terms.
            </p>

            <h2 className="text-2xl font-semibold text-white mb-4">Contact Information</h2>
            <p className="mb-4">
              If you have questions about these Terms & Conditions, please contact us at:
            </p>
            <div className="bg-forest-800/30 p-4 rounded-lg">
              <p className="text-white font-medium">Email: support@gratefultoday.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}