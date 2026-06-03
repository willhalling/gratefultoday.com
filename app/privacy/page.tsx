import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Privacy Policy - Grateful Today',
    description: 'Privacy policy for Grateful Today. Learn how we collect, use, and protect your personal information while using our recovery and gratitude tools.',
    metadataBase: new URL('https://gratefultoday.com')
  };
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-dark-forest">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
        <div className="bg-forest-900/20 backdrop-blur-sm rounded-xl border border-forest-800 p-8">
          <div className="text-sm text-soft-sand-400 mb-6">
            Last updated: 15th October, 2025
          </div>
            
          <div className="prose prose-invert max-w-none text-soft-sand-200">
            <h2 className="text-2xl font-semibold text-white mb-4">Our Commitment to Privacy</h2>
            <p className="mb-6">
              At Grateful Today, we deeply respect your privacy and understand the sensitive nature of 
              recovery journeys. This policy explains how we collect, use, and protect your personal 
              information when using our gratitude and sobriety tools.
            </p>

            <h2 className="text-2xl font-semibold text-white mb-4">Information We Collect</h2>
            
            <h3 className="text-lg font-medium text-white mb-3">Account Information</h3>
            <ul className="list-disc list-inside text-soft-sand-200 space-y-1 mb-4">
              <li>Email address (if you create an account)</li>
              <li>Username or display name</li>
              <li>Recovery milestone dates (optional)</li>
            </ul>

            <h3 className="text-lg font-medium text-white mb-3">Usage Information</h3>
            <ul className="list-disc list-inside text-soft-sand-200 space-y-1 mb-6">
              <li>Pages visited and features used</li>
              <li>Device information and browser type</li>
              <li>IP address and general location</li>
              <li>Time spent on different sections</li>
            </ul>

            <div className="bg-forest-800/30 border-l-4 border-forest-600 p-4 mb-6 rounded-r-lg">
              <h3 className="text-lg font-medium text-white mb-2">Sensitive Recovery Data</h3>
              <p className="text-soft-sand-200">
                <strong>We do not store personal recovery details, addiction history, or private 
                journal entries.</strong> Sobriety chip data is anonymized and used only to display 
                milestone achievements.
              </p>
            </div>

            <h2 className="text-2xl font-semibold text-white mb-4">How We Use Your Information</h2>
            
            <h3 className="text-lg font-medium text-white mb-3">Service Provision</h3>
            <ul className="list-disc list-inside text-soft-sand-200 space-y-1 mb-4">
              <li>Provide sobriety chip celebrations and milestones</li>
              <li>Deliver daily gratitude quotes and affirmations</li>
              <li>Maintain your account and preferences</li>
              <li>Send recovery anniversary reminders (if requested)</li>
            </ul>

            <h3 className="text-lg font-medium text-white mb-3">Improvement & Analytics</h3>
            <ul className="list-disc list-inside text-soft-sand-200 space-y-1 mb-6">
              <li>Understand how our tools help users</li>
              <li>Improve user experience and add helpful features</li>
              <li>Generate anonymized usage statistics</li>
            </ul>

            <h2 className="text-2xl font-semibold text-white mb-4">Information Sharing</h2>
            <div className="bg-amber-900/20 border-l-4 border-amber-600 p-4 mb-6 rounded-r-lg">
              <p className="text-amber-200 mb-3">
                <strong>We do not sell, rent, or share your personal information with third parties.</strong>
              </p>
              <p className="text-amber-200">
                Your recovery journey is private and confidential. We may only share anonymized, 
                aggregated data that cannot identify individual users.
              </p>
            </div>

            <h2 className="text-2xl font-semibold text-white mb-4">Data Security</h2>
            <p className="mb-4">We protect your information through:</p>
            <ul className="list-disc list-inside text-soft-sand-200 space-y-1 mb-6">
              <li>Encrypted data transmission (HTTPS/SSL)</li>
              <li>Secure server infrastructure</li>
              <li>Regular security audits and updates</li>
              <li>Limited access to personal data by staff</li>
            </ul>

            <h2 className="text-2xl font-semibold text-white mb-4">Your Rights & Choices</h2>
            
            <h3 className="text-lg font-medium text-white mb-3">Data Control</h3>
            <ul className="list-disc list-inside text-soft-sand-200 space-y-1 mb-4">
              <li>Access your personal information</li>
              <li>Update or correct your data</li>
              <li>Delete your account and associated data</li>
              <li>Opt out of non-essential communications</li>
            </ul>

            <h3 className="text-lg font-medium text-white mb-3">Cookie Management</h3>
            <p className="mb-6">
              You can control cookie settings through your browser preferences. Some features 
              may not work properly if cookies are disabled.
            </p>

            <h2 className="text-2xl font-semibold text-white mb-4">Third-Party Services</h2>
            <p className="mb-4">We use trusted third-party services for:</p>
            <ul className="list-disc list-inside text-soft-sand-200 space-y-1 mb-6">
              <li><strong>Analytics:</strong> Google Analytics (anonymized)</li>
              <li><strong>Hosting:</strong> Secure cloud infrastructure</li>
              <li><strong>Communication:</strong> Email delivery services</li>
            </ul>

            <h2 className="text-2xl font-semibold text-white mb-4">Changes to Privacy Policy</h2>
            <p className="mb-6">
              We may update this privacy policy as our services evolve. We&apos;ll notify users of 
              significant changes via email or platform notifications.
            </p>

            <h2 className="text-2xl font-semibold text-white mb-4">Contact Us</h2>
            <p className="mb-4">
              Questions about privacy or data handling? We&apos;re here to help:
            </p>
            <div className="bg-forest-800/30 p-4 rounded-lg">
              <p className="text-white font-medium mb-2">Privacy Officer: privacy@gratefultoday.com</p>
              <p className="text-soft-sand-300">General Support: support@gratefultoday.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}