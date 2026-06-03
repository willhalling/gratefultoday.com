'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signInWithCustomToken } from 'firebase/auth';
import { Button, Textarea, Card, CardBody } from '@heroui/react';
import { firestoreAuth } from '@/firebase/firebase-config';
import { setWeekJourneySession } from '@/lib/just-for-a-week-auth';
import { submitDayResponse } from '../actions';
import { DAY_PROMPTS } from '@/types/just-for-a-week';

interface DayPageProps {
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

export function DayPage({ day }: DayPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [response, setResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  const dayData = DAY_PROMPTS[day];

  useEffect(() => {
    const authenticate = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setError('No authentication token found. Please check your email link.');
        setIsAuthenticating(false);
        return;
      }

      try {
        // Sign in with custom token
        const userCredential = await signInWithCustomToken(firestoreAuth, token);
        setUid(userCredential.user.uid);
        
        // Set session cookie
        const idToken = await userCredential.user.getIdToken();
        await setWeekJourneySession(idToken);
        
        setIsAuthenticating(false);
      } catch (err) {
        console.error('Auth error:', err);
        setError('Failed to authenticate. Please try clicking the link from your email again.');
        setIsAuthenticating(false);
      }
    };

    authenticate();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uid || !response.trim()) return;

    setIsSubmitting(true);
    setError(null);

    const result = await submitDayResponse(uid, day, dayData.prompt, response);

    if (result.success) {
      // Show success and redirect
      if (day === 7) {
        router.push('/just-for-a-week/complete');
      } else {
        router.push(`/just-for-a-week/day-${day}/submitted`);
      }
    } else {
      setError(result.error || 'Failed to submit. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (isAuthenticating) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-neutral-600">Preparing your space...</p>
        </div>
      </div>
    );
  }

  if (error && !uid) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardBody className="text-center p-8">
            <h1 className="text-2xl font-bold text-neutral-900 mb-4">Something went wrong</h1>
            <p className="text-neutral-600 mb-6">{error}</p>
            <Button
              as="a"
              href="/just-for-a-week"
              color="primary"
              size="lg"
            >
              Back to Start
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-neutral-600">Day {day} of 7</span>
            <span className="text-sm text-neutral-500">{Math.round((day / 7) * 100)}%</span>
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(day / 7) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Content */}
        <Card className="shadow-lg">
          <CardBody className="p-8 md:p-12">
            <h1 className="text-4xl font-bold text-neutral-900 mb-2">Day {day}</h1>
            <h2 className="text-2xl text-primary mb-8">{dayData.title}</h2>

            <div className="mb-8 p-6 bg-primary-50 rounded-lg border-l-4 border-primary">
              <p className="text-lg text-neutral-800">{dayData.prompt}</p>
            </div>

            <form onSubmit={handleSubmit}>
              <Textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder={dayData.placeholder}
                minRows={10}
                isRequired
                isDisabled={isSubmitting}
                classNames={{
                  input: "text-neutral-900",
                  inputWrapper: "border-neutral-300"
                }}
              />

              {error && (
                <p className="mt-4 text-danger text-sm">{error}</p>
              )}

              <div className="mt-6">
                <Button
                  type="submit"
                  isDisabled={isSubmitting || !response.trim()}
                  color="primary"
                  size="lg"
                  className="w-full font-semibold"
                  isLoading={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : day === 7 ? 'Complete Your Journey' : 'Continue'}
                </Button>
              </div>
            </form>

            <p className="mt-6 text-sm text-neutral-500 text-center">
              Your response is private and will be used to create your personal journey video.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
