'use client';

import { DatePicker } from '@heroui/react';
import { parseDate, type DateValue } from '@internationalized/date';
import { useState, useEffect } from 'react';

interface NewsletterFormProps {
  showUnsubscribe?: boolean;
  initialEmail?: string;
}

export function NewsletterForm({
  showUnsubscribe = false,
  initialEmail = '',
}: NewsletterFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [firstName, setFirstName] = useState('');
  const [lastname, setLastname] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [sobrietyDate, setSobrietyDate] = useState<DateValue | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [checking, setChecking] = useState(false);

  // Silence unused var warning
  const _showUnsubscribe = showUnsubscribe;

  // Check current preferences if email is provided
  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
      checkPreferences(initialEmail);
    }
  }, [initialEmail]);

  const checkPreferences = async (checkEmail: string) => {
    setChecking(true);
    try {
      const response = await fetch(
        `/api/newsletter/preferences?email=${encodeURIComponent(checkEmail)}`
      );
      const data = await response.json();

      if (data.subscribed) {
        setIsSubscribed(true);
        setFrequency(data.frequency || 'daily');

        // Set firstname if it exists
        if (data.firstName) {
          setFirstName(data.firstName);
        }

        // Set lastname if it exists
        if (data.lastname) {
          setLastname(data.lastname);
        }

        // Parse sobriety date if it exists
        if (data.sobrietyDate) {
          try {
            const date = new Date(data.sobrietyDate);
            setSobrietyDate(parseDate(date.toISOString().split('T')[0]));
          } catch (e) {
            console.error('Error parsing sobriety date:', e);
          }
        }
      } else {
        setIsSubscribed(false);
      }
    } catch (error) {
      console.error('Error checking preferences:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Format sobriety date if provided
      const formattedSobrietyDate = sobrietyDate
        ? `${sobrietyDate.year}-${String(sobrietyDate.month).padStart(2, '0')}-${String(sobrietyDate.day).padStart(2, '0')}`
        : undefined;

      const response = await fetch('/api/newsletter/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          firstName,
          lastname,
          frequency,
          sobrietyDate: formattedSobrietyDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update preferences');
      }

      setMessage(data.message);
      setIsSubscribed(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return <p className="text-center text-neutral-600 py-8">Checking your preferences...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* First Name and Last Name Initial */}
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-neutral-700 mb-2">
            First Name
          </label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            placeholder="Your first name"
            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-neutral-900 bg-white"
          />
        </div>
        <div>
          <label htmlFor="lastname" className="block text-sm font-medium text-neutral-700 mb-2">
            Last Name
          </label>
          <input
            id="lastname"
            type="text"
            value={lastname}
            onChange={(e) => setLastname(e.target.value.slice(0, 1).toUpperCase())}
            required
            maxLength={1}
            placeholder="M"
            className="w-[60px] px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-neutral-900 bg-white text-center"
          />
        </div>
      </div>

      {/* Email Input */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="your@email.com"
          className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition text-neutral-900 bg-white"
        />
      </div>

      {/* Frequency Selection */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-3">
          How often would you like to receive emails?
        </label>
        <div className="space-y-3">
          <label
            className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition hover:bg-neutral-50 ${
              frequency === 'daily' ? 'border-primary bg-primary/5' : 'border-neutral-200'
            }`}
          >
            <input
              type="radio"
              name="frequency"
              value="daily"
              checked={frequency === 'daily'}
              onChange={(e) => setFrequency(e.target.value as 'daily')}
              className="mt-1 h-4 w-4 accent-accent"
            />
            <div className="ml-3">
              <div className="font-semibold text-neutral-900">Daily Newsletter</div>
              <div className="text-sm text-neutral-600">Get a gratitude prompt every morning</div>
            </div>
          </label>

          <label
            className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition hover:bg-neutral-50 ${
              frequency === 'weekly' ? 'border-primary bg-primary/5' : 'border-neutral-200'
            }`}
          >
            <input
              type="radio"
              name="frequency"
              value="weekly"
              checked={frequency === 'weekly'}
              onChange={(e) => setFrequency(e.target.value as 'weekly')}
              className="mt-1 h-4 w-4 accent-accent"
            />
            <div className="ml-3">
              <div className="font-semibold text-neutral-900">Weekly Newsletter</div>
              <div className="text-sm text-neutral-600">Get one email every Monday</div>
            </div>
          </label>
        </div>
      </div>

      {/* Sobriety Date (Optional) */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Sobriety Date (optional)
        </label>
        <DatePicker
          value={sobrietyDate}
          onChange={setSobrietyDate}
          className="w-full"
          label=""
          placeholderValue={parseDate(new Date().toISOString().split('T')[0])}
        />
        <p className="text-xs text-neutral-500 mt-1">
          If you're tracking sobriety, we can personalize your experience
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.includes('unsubscribed')
              ? 'bg-neutral-100 text-neutral-800'
              : 'bg-green-50 text-green-800 border border-green-200'
          }`}
        >
          {message}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !email || !firstName || !lastname}
        className="w-full px-6 py-3 bg-accent hover:bg-accent-600 text-neutral-900 font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Processing...' : isSubscribed ? 'Update Preferences' : 'Subscribe'}
      </button>
    </form>
  );
}
