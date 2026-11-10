'use client';

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react';
import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { NewsletterForm } from '@/components/newsletter/NewsletterForm';

function PreferencesContent() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email');

  const [showUnsubscribeModal, setShowUnsubscribeModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUnsubscribe = async () => {
    if (!emailParam) return;

    setLoading(true);
    setMessage('');
    setShowUnsubscribeModal(false);

    try {
      const response = await fetch(
        `/api/newsletter/preferences?email=${encodeURIComponent(emailParam)}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unsubscribe');
      }

      setMessage('You have been unsubscribed from all newsletters.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-accent p-8">
            <h1 className="text-3xl font-bold text-white mb-2">Newsletter Preferences</h1>
            <p className="text-white/90">
              Manage your Daily Gratitude Reflection newsletter subscription
            </p>
          </div>

          {/* Body */}
          <div className="p-8">
            <NewsletterForm showUnsubscribe={true} initialEmail={emailParam || ''} />

            {/* Unsubscribe Button */}
            {emailParam && (
              <div className="mt-6 pt-6 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setShowUnsubscribeModal(true)}
                  disabled={loading}
                  className="w-full px-6 py-3 border-2 border-neutral-300 hover:border-neutral-400 text-neutral-700 font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Unsubscribe from all newsletters
                </button>
              </div>
            )}

            {/* Unsubscribe Message */}
            {message && (
              <div className="mt-4 p-4 rounded-lg bg-neutral-100 text-neutral-800">{message}</div>
            )}

            {/* Info Section */}
            <div className="mt-8 pt-8 border-t border-neutral-200">
              <h3 className="font-semibold text-neutral-900 mb-3">About Our Newsletters</h3>
              <div className="space-y-3 text-sm text-neutral-600">
                <p>
                  <strong className="text-neutral-900">Daily Newsletter:</strong> Receive a
                  gratitude prompt every morning at 7am UTC. Perfect for building a daily gratitude
                  practice.
                </p>
                <p>
                  <strong className="text-neutral-900">Weekly Newsletter:</strong> Get one email
                  every Monday morning. Great if you prefer a slower pace.
                </p>
                <p className="text-xs text-neutral-500 pt-2">
                  You can change your preferences or unsubscribe at any time. We respect your inbox
                  and your privacy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unsubscribe Confirmation Modal */}
      <Modal isOpen={showUnsubscribeModal} onClose={() => setShowUnsubscribeModal(false)}>
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            Unsubscribe from all newsletters?
          </ModalHeader>
          <ModalBody>
            <p>
              Are you sure you want to unsubscribe from all newsletters? You can always resubscribe
              later.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => setShowUnsubscribeModal(false)}
              isDisabled={loading}
            >
              Cancel
            </Button>
            <Button color="danger" onPress={handleUnsubscribe} isLoading={loading}>
              Unsubscribe
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

export default function NewsletterPreferencesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <PreferencesContent />
    </Suspense>
  );
}
