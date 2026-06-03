'use client';

import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthUserContext';
import { firestoreDb } from '@/firebase/firebase-config';
import { containsHarmfulContent, CRISIS_RESOURCES } from '@/lib/contentFilter';
import {
  MAX_POSTS_PER_DAY,
  MAX_POST_LENGTH,
  MIN_POST_LENGTH,
  AVATAR_COLORS,
} from '@/types/gratitude';

interface GratitudePostFormProps {
  promptId?: string;
  promptText?: string;
  onPostCreated?: () => void;
}

export function GratitudePostForm({ promptId, promptText, onPostCreated }: GratitudePostFormProps) {
  const { authUser: user } = useAuth();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [postsToday, setPostsToday] = useState(0);
  const [showCrisisResources, setShowCrisisResources] = useState(false);

  const checkPostsToday = useCallback(async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const postsRef = collection(firestoreDb, 'gratitudePosts');
    const q = query(postsRef, where('userId', '==', user.uid), where('createdDate', '==', today));

    const snapshot = await getDocs(q);
    setPostsToday(snapshot.size);
  }, [user]);

  useEffect(() => {
    if (user) {
      void checkPostsToday();
    }
  }, [user, checkPostsToday]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      setMessage('Please sign in to post');
      return;
    }

    if (text.length < MIN_POST_LENGTH) {
      setMessage(`Post must be at least ${MIN_POST_LENGTH} characters`);
      return;
    }

    if (text.length > MAX_POST_LENGTH) {
      setMessage(`Post must be less than ${MAX_POST_LENGTH} characters`);
      return;
    }

    if (postsToday >= MAX_POSTS_PER_DAY) {
      setMessage(
        `You've reached your limit of ${MAX_POSTS_PER_DAY} posts today. Come back tomorrow!`
      );
      return;
    }

    // Check for harmful content
    if (containsHarmfulContent(text)) {
      setShowCrisisResources(true);
      setMessage('We detected language that concerns us. Please reach out for support.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Random avatar color
      const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      const today = new Date().toISOString().split('T')[0];

      // Try to fetch user's firstName and lastname from Brevo newsletter data
      let firstName: string | undefined;
      let lastname: string | undefined;

      try {
        const response = await fetch(
          `/api/newsletter/preferences?email=${encodeURIComponent(user.email || '')}`
        );
        if (response.ok) {
          const data = await response.json();
          firstName = data.firstName || undefined;
          lastname = data.lastname || undefined;
        }
      } catch (error) {
        console.error('Error fetching user name:', error);
        // Continue without name - it's optional
      }

      const postData: any = {
        text: text.trim(),
        userId: user.uid,
        createdAt: serverTimestamp(),
        createdDate: today, // For rate limiting queries
        promptId: promptId || null,
        flagged: false,
        flagCount: 0,
        avatarColor,
        isArchived: false,
      };

      // Only add firstName and lastname if they exist (Firestore doesn't allow undefined)
      if (firstName) postData.firstName = firstName;
      if (lastname) postData.lastname = lastname;

      await addDoc(collection(firestoreDb, 'gratitudePosts'), postData);

      setMessage('Your gratitude has been shared with the community');
      setText('');
      setPostsToday(postsToday + 1);

      // Notify parent to refresh wall
      if (onPostCreated) {
        onPostCreated();
      }

      // Clear success message after 5 seconds
      window.setTimeout(() => setMessage(''), 5000);
    } catch (error) {
      console.error('Error posting gratitude:', error);
      setMessage('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const remainingPosts = MAX_POSTS_PER_DAY - postsToday;
  const charCount = text.length;
  const isOverLimit = charCount > MAX_POST_LENGTH;
  const isUnderMin = charCount < MIN_POST_LENGTH && charCount > 0;

  if (!user) {
    return (
      <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-5 border border-white/30">
        <p className="text-white text-sm text-center leading-relaxed mb-4">
          sign in via email to share your gratitude with the community
        </p>
        <a
          href="/newsletter"
          className="block w-full px-5 py-2.5 bg-amber-200 hover:bg-amber-300 text-[#78716c] text-sm font-semibold rounded-full transition-all shadow-sm hover:shadow-md text-center"
        >
          join community
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {promptText && (
        <div className="p-4 bg-white/20 backdrop-blur-sm rounded-xl border-l-4 border-white/40">
          <p className="text-xs text-white/80 mb-1 font-medium">Today's prompt:</p>
          <p className="text-sm text-white">{promptText}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label
            htmlFor="gratitude"
            className="block text-xs font-semibold text-white mb-2 uppercase tracking-wide"
          >
            Share Your Gratitude
          </label>
          <textarea
            id="gratitude"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What are you grateful for today?"
            rows={5}
            className="w-full px-3 py-2.5 border border-white/30 rounded-xl focus:ring-2 focus:ring-white focus:border-transparent outline-none transition resize-none text-sm text-neutral-900 bg-white"
            disabled={loading || remainingPosts === 0}
          />
          <div className="flex justify-between items-center mt-1.5 text-xs">
            <span
              className={`font-medium ${
                isOverLimit ? 'text-red-200' : isUnderMin ? 'text-amber-200' : 'text-white/70'
              }`}
            >
              {charCount}/{MAX_POST_LENGTH}
              {isUnderMin && ` (min ${MIN_POST_LENGTH})`}
            </span>
            <span className="text-white/70">
              {remainingPosts}/{MAX_POSTS_PER_DAY} left today
            </span>
          </div>
        </div>

        {message && (
          <div
            className={`p-3 rounded-xl text-sm ${
              message.includes('shared')
                ? 'bg-green-50 text-green-800 border border-green-200'
                : message.includes('concern')
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            {message}
          </div>
        )}

        {showCrisisResources && (
          <div className="p-4 bg-red-50 rounded-xl border border-red-200">
            <h3 className="font-semibold text-sm text-red-900 mb-2">{CRISIS_RESOURCES.title}</h3>
            <p className="text-xs text-red-800 mb-3">{CRISIS_RESOURCES.message}</p>
            <div className="space-y-2">
              {CRISIS_RESOURCES.resources.map((resource, index) => (
                <div key={index} className="bg-white p-2.5 rounded-lg border border-red-300">
                  <p className="font-medium text-sm text-red-900">{resource.name}</p>
                  <p className="text-xs text-red-800">{resource.contact}</p>
                  <p className="text-xs text-red-600">{resource.available}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || remainingPosts === 0 || isOverLimit || charCount < MIN_POST_LENGTH}
          className="w-full px-5 py-2.5 bg-amber-200 hover:bg-amber-300 text-[#78716c] text-sm font-semibold rounded-full transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? 'Sharing...'
            : remainingPosts === 0
              ? 'Daily Limit Reached'
              : 'Share Gratitude'}
        </button>

        <p className="text-xs text-white/70 text-center leading-relaxed">
          Anonymous to others • Moderated for safety
        </p>
      </form>
    </div>
  );
}
