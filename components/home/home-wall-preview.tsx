"use client";

import Link from "next/link";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { firestoreDb } from "@/firebase/firebase-config";
import type { GratitudePost } from "@/types/gratitude";

export default function HomeWallPreview() {
  const [posts, setPosts] = useState<GratitudePost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const postsQuery = query(
      collection(firestoreDb, "gratitudePosts"),
      where("flagged", "==", false),
      orderBy("createdAt", "desc"),
      limit(3),
    );
    getDocs(postsQuery)
      .then((snapshot) => {
        if (cancelled) return;
        setPosts(
          snapshot.docs
            .map(
              (document) =>
                ({ id: document.id, ...document.data() }) as GratitudePost,
            )
            .filter((post) => !post.isArchived),
        );
      })
      .catch((error) => console.error("Error loading wall preview:", error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
        From the Gratitude Wall
      </p>
      <div className="mt-6 space-y-4">
        {loading && (
          <p className="text-primary-200">Reading today&apos;s notes…</p>
        )}
        {!loading &&
          posts.map((post) => (
            <blockquote
              key={post.id}
              className="border-l-2 border-secondary pl-4 font-heading text-xl italic leading-relaxed text-primary-100"
            >
              “{post.text}”
            </blockquote>
          ))}
        {!loading && posts.length === 0 && (
          <p className="text-primary-200">
            The wall is ready for its next small good thing.
          </p>
        )}
      </div>
      <Link
        href="/wall"
        className="mt-7 inline-block text-sm font-semibold text-secondary underline underline-offset-4"
      >
        See the whole wall →
      </Link>
    </section>
  );
}
