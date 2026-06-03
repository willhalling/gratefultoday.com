'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthUserContext';
import type { VideoMetadata, VideoData } from '@/lib/video-utils';
import {
  createSlug,
  generateVideoId,
  DEFAULT_VIDEO_SETTINGS,
  DEFAULT_VIDEO_OUTPUT_SETTINGS,
} from '@/lib/video-utils';

export function useVideoManagement() {
  const { authUser } = useAuth();
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  // Load user's videos
  useEffect(() => {
    if (!authUser) {
      setVideos([]);
      setLoading(false);
      return;
    }

    const loadVideos = async () => {
      try {
        const { firestoreDb } = await import('@/firebase/firebase-config');
        const { collection, query, orderBy, getDocs } = await import('firebase/firestore');

        if (!firestoreDb) {
          setLoading(false);
          return;
        }

        const videosRef = collection(firestoreDb, `users/${authUser.uid}/videos`);
        const q = query(videosRef, orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);

        const videoList: VideoMetadata[] = [];
        snapshot.forEach((doc) => {
          videoList.push({ ...doc.data(), userId: authUser.uid, id: doc.id } as VideoMetadata & {
            id: string;
          });
        });

        setVideos(videoList);
      } catch (error) {
        console.error('Error loading videos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadVideos();
  }, [authUser]);

  // Create new video
  const createVideo = useCallback(
    async (name: string): Promise<string | null> => {
      if (!authUser || !name.trim()) {
        console.error('No auth user or empty name:', { authUser: !!authUser, name });
        return null;
      }

      try {
        const { firestoreDb } = await import('@/firebase/firebase-config');
        const { doc, setDoc } = await import('firebase/firestore');

        if (!firestoreDb) {
          console.error('No firestoreDb available');
          return null;
        }

        const videoId = generateVideoId();
        const slug = createSlug(name);
        const now = Date.now();

        const metadata: VideoMetadata = {
          name: name.trim(),
          slug,
          createdAt: now,
          updatedAt: now,
          userId: authUser.uid,
        };

        const videoData: VideoData = {
          ...metadata,
          advancedSettings: DEFAULT_VIDEO_SETTINGS,
          videoSettings: {
            ...DEFAULT_VIDEO_OUTPUT_SETTINGS,
            videoTitle: name.trim(),
            videoDescription: `🤖 AI DISCLOSURE:
This meditation uses AI-generated voice (ElevenLabs) and imagery 
(Midjourney) to provide accessible 24/7 support for the recovery 
community. Script and creative direction by GratefulToday.

---

📝 Original meditation script written specifically for [Day #/Theme]
🎵 Original music composition (Suno AI)
🎨 Curated AI-generated and stock visuals
✍️ Human-directed creative process

This is a resource, not a replacement for professional treatment.

If in crisis:
- 988 Suicide & Crisis Lifeline
- SAMHSA: 1-800-662-4357
- Crisis Text: HOME to 741741

---

#meditation #recovery #sobriety #aiassisted`,
          },
        };

        console.log('Creating video:', { videoId, slug, userId: authUser.uid });

        // Save metadata for fast listing
        await setDoc(doc(firestoreDb, `users/${authUser.uid}/videos/${videoId}`), metadata);
        console.log('Saved metadata');

        // Save full data
        await setDoc(doc(firestoreDb, `videoData/${videoId}`), videoData);
        console.log('Saved video data');

        // Update local state
        setVideos((prev) => [{ ...metadata, id: videoId } as any, ...prev]);

        return slug;
      } catch (error) {
        console.error('Error creating video:', error);
        return null;
      }
    },
    [authUser]
  );

  // Get video by slug
  const getVideoBySlug = useCallback(
    async (slug: string): Promise<(VideoData & { id: string }) | null> => {
      if (!authUser) {
        console.error('No auth user when getting video by slug');
        return null;
      }

      try {
        const { firestoreDb } = await import('@/firebase/firebase-config');
        const { collection, query, where, getDocs, doc, getDoc } =
          await import('firebase/firestore');

        if (!firestoreDb) {
          console.error('No firestoreDb available');
          return null;
        }

        console.log('Getting video by slug:', slug, 'for user:', authUser.uid);

        // Find video by slug in user's videos
        const videosRef = collection(firestoreDb, `users/${authUser.uid}/videos`);
        const q = query(videosRef, where('slug', '==', slug));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          console.error('No video found with slug:', slug);
          return null;
        }

        const videoId = snapshot.docs[0].id;
        console.log('Found video ID:', videoId);

        const videoDataRef = doc(firestoreDb, `videoData/${videoId}`);
        const videoDataSnap = await getDoc(videoDataRef);

        if (!videoDataSnap.exists()) {
          console.error('Video data not found for ID:', videoId);
          return null;
        }

        console.log('Successfully loaded video data');
        return { ...videoDataSnap.data(), id: videoId } as VideoData & { id: string };
      } catch (error) {
        console.error('Error getting video by slug:', error);
        return null;
      }
    },
    [authUser]
  );

  // Delete video
  const deleteVideo = useCallback(
    async (videoId: string): Promise<boolean> => {
      if (!authUser) return false;

      try {
        const { firestoreDb } = await import('@/firebase/firebase-config');
        const { doc, deleteDoc } = await import('firebase/firestore');

        if (!firestoreDb) return false;

        // Delete metadata
        await deleteDoc(doc(firestoreDb, `users/${authUser.uid}/videos/${videoId}`));

        // Delete full data
        await deleteDoc(doc(firestoreDb, `videoData/${videoId}`));

        // Update local state
        setVideos((prev) => prev.filter((v) => (v as any).id !== videoId));

        return true;
      } catch (error) {
        console.error('Error deleting video:', error);
        return false;
      }
    },
    [authUser]
  );

  return {
    videos,
    loading,
    createVideo,
    getVideoBySlug,
    deleteVideo,
  };
}
