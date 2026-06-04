'use client';
import { Plus, Video, Clock, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import { useAuth } from '@/context/AuthUserContext';
import { useVideoManagement } from '@/hooks/useVideoManagement';

export default function VideoEditorListPage() {
  const router = useRouter();
  const { authUser } = useAuth();
  const { videos, loading, createVideo, deleteVideo } = useVideoManagement();
  const [videoName, setVideoName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!videoName.trim()) {
      setError('Please enter a video name');
      return;
    }

    if (!authUser) {
      setError('Please sign in to create videos');
      return;
    }

    setCreating(true);
    try {
      console.log('Creating video with name:', videoName);
      console.log('Auth user:', authUser);
      const slug = await createVideo(videoName);
      console.log('Create result:', slug);
      if (slug) {
        router.push(`/admin/video-editor/${slug}`);
      } else {
        setError('Failed to create video - check console for details');
      }
    } catch (error) {
      console.error('Error creating video:', error);
      setError(`Error creating video: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (videoId: string, videoName: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete "${videoName}"? This cannot be undone.`)) {
      return;
    }

    const success = await deleteVideo(videoId);
    if (!success) {
      setError('Failed to delete video');
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-neutral-50">
        <div className="mx-auto max-w-6xl px-6 py-12">
          {/* Header */}
          <div className="mb-12">
            <h1 className="mb-4 text-4xl font-bold text-neutral-900">Video Editor</h1>
            <p className="text-lg text-neutral-600">Create and manage slowed + reverb videos</p>
          </div>

          {/* Create New Video */}
          <div className="mb-12 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Video className="h-5 w-5 text-neutral-700" />
              <h2 className="text-xl font-semibold text-neutral-900">Create New Video</h2>
            </div>
            <form onSubmit={handleCreate} className="flex gap-3">
              <input
                type="text"
                placeholder="Enter video name (e.g., My Cool Song Slowed)"
                value={videoName}
                onChange={(e) => setVideoName(e.target.value)}
                className="flex-1 rounded-md border border-neutral-300 bg-white px-4 py-2 text-neutral-900 placeholder:text-neutral-500 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                disabled={creating || !authUser}
              />
              <button
                type="submit"
                disabled={creating || !authUser}
                className="flex items-center gap-2 rounded-md bg-neutral-900 px-6 py-2 text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create
                  </>
                )}
              </button>
            </form>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            {!authUser && (
              <p className="mt-3 text-sm text-neutral-500">Please sign in to create videos</p>
            )}
          </div>

          {/* Video List */}
          {authUser && (
            <div>
              <h2 className="mb-6 text-2xl font-bold text-neutral-900">Your Videos</h2>
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-900" />
                </div>
              ) : videos.length === 0 ? (
                <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center shadow-sm">
                  <Video className="mx-auto mb-4 h-12 w-12 text-neutral-400" />
                  <p className="text-neutral-600">No videos yet. Create your first one above!</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {videos.map((video) => (
                    <div
                      key={(video as any).id}
                      className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm transition-all hover:border-neutral-400 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => router.push(`/admin/video-editor/${video.slug}`)}
                        >
                          <h3 className="mb-1 text-lg font-semibold text-neutral-900">
                            {video.name}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-neutral-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(video.updatedAt)}
                            </span>
                            <span className="text-neutral-400">/{video.slug}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleDelete((video as any).id, video.name, e)}
                            className="rounded-md p-2 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <div
                            className="cursor-pointer text-neutral-900 hover:text-neutral-700"
                            onClick={() => router.push(`/admin/video-editor/${video.slug}`)}
                          >
                            →
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sign-in prompt */}
          {!authUser && (
            <div className="mt-12 text-center">
              <div className="rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
                <h3 className="mb-3 text-xl font-semibold text-neutral-900">
                  Sign in to save your videos
                </h3>
                <p className="text-neutral-600">
                  Create an account to save your work, access your videos from any device, and keep
                  your settings organized.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
