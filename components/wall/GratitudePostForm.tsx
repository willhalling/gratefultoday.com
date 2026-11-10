"use client";

import Link from "next/link";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useAuth } from "@/context/AuthUserContext";
import { firestoreDb } from "@/firebase/firebase-config";
import { containsHarmfulContent, CRISIS_RESOURCES } from "@/lib/contentFilter";
import {
  MAX_POSTS_PER_DAY,
  MAX_POST_LENGTH,
  MIN_POST_LENGTH,
  AVATAR_COLORS,
} from "@/types/gratitude";

interface GratitudePostFormProps {
  promptId?: string;
  promptText?: string;
  onPostCreated?: () => void;
  compact?: boolean;
}

export function GratitudePostForm({
  promptId,
  promptText,
  onPostCreated,
  compact = false,
}: GratitudePostFormProps) {
  const { authUser: user } = useAuth();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [postsToday, setPostsToday] = useState(0);
  const [showCrisisResources, setShowCrisisResources] = useState(false);

  const checkPostsToday = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const postsRef = collection(firestoreDb, "gratitudePosts");
    const q = query(
      postsRef,
      where("userId", "==", user.uid),
      where("createdDate", "==", today),
    );
    const snapshot = await getDocs(q);
    setPostsToday(snapshot.size);
  }, [user]);

  useEffect(() => {
    if (user) void checkPostsToday();
  }, [user, checkPostsToday]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) {
      setMessage("Join the community to share your gratitude.");
      return;
    }
    if (text.trim().length < MIN_POST_LENGTH) {
      setMessage(`Post must be at least ${MIN_POST_LENGTH} characters.`);
      return;
    }
    if (text.length > MAX_POST_LENGTH) {
      setMessage(`Post must be less than ${MAX_POST_LENGTH} characters.`);
      return;
    }
    if (postsToday >= MAX_POSTS_PER_DAY) {
      setMessage(
        `You've reached your limit of ${MAX_POSTS_PER_DAY} posts today. Come back tomorrow.`,
      );
      return;
    }
    if (containsHarmfulContent(text)) {
      setShowCrisisResources(true);
      setMessage(
        "We detected language that concerns us. Please reach out for support.",
      );
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const avatarColor =
        AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      const today = new Date().toISOString().split("T")[0];
      let firstName: string | undefined;
      let lastname: string | undefined;
      try {
        const response = await fetch(
          `/api/newsletter/preferences?email=${encodeURIComponent(user.email || "")}`,
        );
        if (response.ok) {
          const data = await response.json();
          firstName = data.firstName || undefined;
          lastname = data.lastname || undefined;
        }
      } catch (error) {
        console.error("Error fetching user name:", error);
      }

      const postData: Record<string, unknown> = {
        text: text.trim(),
        userId: user.uid,
        createdAt: serverTimestamp(),
        createdDate: today,
        promptId: promptId || null,
        flagged: false,
        flagCount: 0,
        avatarColor,
        isArchived: false,
      };
      if (firstName) postData.firstName = firstName;
      if (lastname) postData.lastname = lastname;
      await addDoc(collection(firestoreDb, "gratitudePosts"), postData);
      setMessage("Your gratitude has been shared with the community.");
      setText("");
      setPostsToday((count) => count + 1);
      onPostCreated?.();
      window.setTimeout(() => setMessage(""), 5000);
    } catch (error) {
      console.error("Error posting gratitude:", error);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const remainingPosts = MAX_POSTS_PER_DAY - postsToday;
  const isOverLimit = text.length > MAX_POST_LENGTH;
  const isUnderMin = text.trim().length < MIN_POST_LENGTH && text.length > 0;

  if (!user && !compact) {
    return (
      <div className="rounded-2xl border border-primary-100 bg-primary-50 p-5 text-center">
        <p className="mb-4 text-sm leading-relaxed text-neutral-700">
          Sign in via email to share your gratitude with the community.
        </p>
        <Link
          href="/newsletter"
          className="inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-50"
        >
          Join community
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {promptText && (
        <div className="rounded-xl border-l-4 border-primary-300 bg-primary-50 p-4">
          <p className="mb-1 text-xs font-medium text-primary-700">
            Today&apos;s prompt
          </p>
          <p className="text-sm text-neutral-700">{promptText}</p>
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className={compact ? "space-y-3" : "space-y-4"}
      >
        <div className={compact ? "flex flex-col gap-3 sm:flex-row" : ""}>
          <label
            htmlFor={compact ? "homepage-gratitude" : "wall-gratitude"}
            className="sr-only"
          >
            What are you grateful for today?
          </label>
          <textarea
            id={compact ? "homepage-gratitude" : "wall-gratitude"}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Type it here…"
            rows={compact ? 1 : 4}
            className="w-full flex-1 resize-none rounded-xl border border-primary-200 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            disabled={loading || (user !== null && remainingPosts === 0)}
            maxLength={MAX_POST_LENGTH + 1}
          />
          <button
            type="submit"
            disabled={
              loading ||
              (user !== null && remainingPosts === 0) ||
              isOverLimit ||
              text.trim().length < MIN_POST_LENGTH
            }
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-50 transition-colors hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Sharing…"
              : user && remainingPosts === 0
                ? "Daily limit reached"
                : "Share"}
          </button>
        </div>
        {!compact && (
          <div className="flex justify-between text-xs text-neutral-500">
            <span className={isOverLimit || isUnderMin ? "text-amber-700" : ""}>
              {text.length}/{MAX_POST_LENGTH}
              {isUnderMin ? ` · minimum ${MIN_POST_LENGTH}` : ""}
            </span>
            {user && (
              <span>
                {remainingPosts}/{MAX_POSTS_PER_DAY} left today
              </span>
            )}
          </div>
        )}
        {message && (
          <div
            className={`rounded-xl p-3 text-sm ${message.includes("shared") ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"}`}
            role="status"
          >
            {message}{" "}
            {!user && (
              <Link
                href="/newsletter"
                className="font-semibold underline underline-offset-2"
              >
                Join here
              </Link>
            )}
          </div>
        )}
        {showCrisisResources && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <h3 className="font-semibold text-red-900">
              {CRISIS_RESOURCES.title}
            </h3>
            <p className="mt-1 text-sm text-red-800">
              {CRISIS_RESOURCES.message}
            </p>
            <Link
              href="/support"
              className="mt-3 inline-block text-sm font-semibold text-red-900 underline underline-offset-4"
            >
              See support options
            </Link>
          </div>
        )}
        {!compact && (
          <p className="text-center text-xs text-neutral-500">
            Anonymous to others · Moderated for safety
          </p>
        )}
      </form>
    </div>
  );
}
