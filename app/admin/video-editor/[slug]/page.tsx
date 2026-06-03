'use client';

import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import { SlowedReverbGenerator } from '@/components/video-editor/SlowedReverbGenerator';
import { useAuth } from '@/context/AuthUserContext';
import { useVideoManagement } from '@/hooks/useVideoManagement';
import type { VideoData } from '@/lib/video-utils';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function VideoEditorPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { getVideoBySlug } = useVideoManagement();
  const { authUser, loading: authLoading } = useAuth();
  const [video, setVideo] = useState<(VideoData & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // Wait for auth to load before trying to fetch video
    if (authLoading) {
      console.log('Waiting for auth to load...');
      return;
    }

    if (!authUser) {
      console.log('No auth user after loading');
      setLoading(false);
      setNotFound(true);
      return;
    }

    const loadVideo = async () => {
      console.log('Loading video with slug:', resolvedParams.slug);
      try {
        const videoData = await getVideoBySlug(resolvedParams.slug);
        if (videoData) {
          console.log('Video loaded successfully');
          setVideo(videoData as VideoData & { id: string });
        } else {
          console.log('Video not found');
          setNotFound(true);
        }
      } catch (error) {
        console.error('Error loading video:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadVideo();
  }, [resolvedParams.slug, getVideoBySlug, authUser, authLoading]);

  if (loading) {
    return (
      <AdminGuard>
        <div className="flex min-h-screen items-center justify-center bg-neutral-50">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-900" />
            <p className="mt-4 text-neutral-600">Loading video...</p>
          </div>
        </div>
      </AdminGuard>
    );
  }

  if (notFound || !video) {
    return (
      <AdminGuard>
        <div className="flex min-h-screen items-center justify-center bg-neutral-50">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold text-neutral-900">Video Not Found</h1>
            <p className="mb-6 text-neutral-600">
              The video you're looking for doesn't exist or you don't have access to it.
            </p>
            <button
              onClick={() => router.push('/admin/video-editor')}
              className="rounded-md bg-neutral-900 px-6 py-2 text-white hover:bg-neutral-800"
            >
              Back to Videos
            </button>
          </div>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-black">
        <SlowedReverbGenerator
          videoId={(video as VideoData & { id: string }).id}
          fullWidthPreview={true}
        />
      </div>
    </AdminGuard>
  );
}
