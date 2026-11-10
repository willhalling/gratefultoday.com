'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Re-renders the server page every few seconds while the video is being made. */
export default function AutoRefresh({ seconds = 6 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
