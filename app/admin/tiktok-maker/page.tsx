'use client';

import dynamic from 'next/dynamic';
import AdminGuard from '@/components/AdminGuard';

// The studio drives WebGL, Web Audio and WebCodecs — client only.
const TikTokMakerStudio = dynamic(() => import('@/components/tiktok-maker/tiktok-maker-studio'), {
  ssr: false,
});

export default function TikTokMakerPage() {
  return (
    <AdminGuard>
      <TikTokMakerStudio />
    </AdminGuard>
  );
}
