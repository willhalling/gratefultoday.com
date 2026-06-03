'use client';

import { useState } from 'react';
import { Button, Input } from '@heroui/react';

const BREVO_API_KEY = process.env.NEXT_PUBLIC_BREVO_API_KEY;
const BREVO_LIST_ID = process.env.NEXT_PUBLIC_BREVO_NEWSLETTER_LIST_ID;

export function NewsletterSignupBar() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: data.message === 'Already subscribed' 
            ? "You're already signed up! Check your email tomorrow morning."
            : 'Signed up. Check your email tomorrow morning.',
        });
        setEmail('');
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Something went wrong.',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to sign up. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="sticky top-0 left-0 right-0 bg-primary border-b-2 border-primary-600 shadow-md z-50">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full sm:w-auto">
            <p className="text-sm sm:text-base font-medium text-white">
              Daily gratitude in your inbox. One email. Every morning.
            </p>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              size="md"
              isRequired
              isDisabled={isSubmitting}
              className="w-full sm:w-64"
              classNames={{
                input: "bg-white",
                inputWrapper: "bg-white"
              }}
            />
            <Button
              type="submit"
              color="default"
              size="md"
              isLoading={isSubmitting}
              isDisabled={isSubmitting || !email}
              className="bg-white text-primary font-semibold hover:bg-neutral-100"
            >
              Sign up
            </Button>
          </div>
        </form>

        {message && (
          <p className={`mt-2 text-xs sm:text-sm text-center font-medium ${message.type === 'success' ? 'text-white' : 'text-red-100'}`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
