'use client';

import { useMemo, useState } from 'react';
import { signupForWeek } from '../actions';

export default function WeekJourneySignupForm() {
  const [email, setEmail] = useState('');
  const defaultTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch {
      return '';
    }
  }, []);
  const [timezone, setTimezone] = useState<string>(defaultTz);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const timezones = useMemo<string[]>(() => {
    const curated = [
      // United States
      'America/Los_Angeles', // Pacific
      'America/Denver', // Mountain
      'America/Chicago', // Central
      'America/New_York', // Eastern
      // Canada
      'America/Vancouver',
      'America/Edmonton',
      'America/Winnipeg',
      'America/Toronto',
      'America/Halifax',
      'America/St_Johns',
      // Europe (representative major cities)
      'Europe/Dublin',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Madrid',
      'Europe/Rome',
      'Europe/Amsterdam',
      'Europe/Zurich',
      'Europe/Stockholm',
      // Australia & NZ
      'Australia/Perth',
      'Australia/Adelaide',
      'Australia/Brisbane',
      'Australia/Sydney',
      'Pacific/Auckland',
      // Fallback
      'UTC',
    ];
    // Ensure detected tz is present at the top if not in curated
    const detected = defaultTz;
    if (detected && !curated.includes(detected)) {
      return [detected, ...curated];
    }
    return curated;
  }, [defaultTz]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await signupForWeek(email, timezone);

    if (result.success) {
      setMessage({
        type: 'success',
        text: 'Check your email: Day 1 is on its way.',
      });
      setEmail('');
      setTimezone(defaultTz);
    } else {
      setMessage({
        type: 'error',
        text: result.error || 'Something went wrong. Please try again.',
      });
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-neutral-800 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="w-full px-4 py-3 border border-neutral-300 rounded-lg bg-white text-neutral-900 placeholder-neutral-500 focus:ring-2 focus:ring-accent focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-800 mb-1">
          Preferred timezone
        </label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full px-4 py-3 border border-neutral-300 rounded-lg bg-white text-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">Select your timezone</option>
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center rounded-lg bg-accent px-8 py-4 text-neutral-900 text-lg font-medium shadow-md hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Starting Your Journey...' : 'Start My Week'}
      </button>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}
    </form>
  );
}
