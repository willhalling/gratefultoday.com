'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button, Card, CardBody, Chip, Progress, Textarea } from '@heroui/react';
import type { ContentOsPost } from '@/types/content-os';

// Public download page — no auth required.
// Linked from the admin QR code so the user can scan on their phone and
// immediately download the rendered MP4 + copy the TikTok caption.

export default function SharedPostPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<ContentOsPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [captionCopied, setCaptionCopied] = useState(false);
  const [tagsCopied, setTagsCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/content-os/posts/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.post) setPost(data.post);
        else setError(data.error || 'Post not found');
      })
      .catch(() => setError('Failed to load post'))
      .finally(() => setLoading(false));
  }, [id]);

  async function copyText(text: string, setCopied: (v: boolean) => void) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available — user can manually select
    }
  }

  async function downloadVideo() {
    if (!post?.renderUrl) return;
    try {
      const response = await fetch(post.renderUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (post.name || 'video').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
      a.download = `${safeName}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab so user can long-press save on iOS
      window.open(post.renderUrl, '_blank', 'noopener');
    }
  }

  const caption = post?.name || '';
  const tagsText = post?.tags?.length
    ? post.tags
        .slice(0, 5)
        .map((t) => (t.startsWith('#') ? t : `#${t}`))
        .join(' ')
    : '';

  return (
    <div className="min-h-screen bg-default-50 px-4 py-6">
      <div className="mx-auto max-w-sm space-y-4">

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Quick post</h1>
          <p className="text-sm text-default-500">Download the video and copy your caption.</p>
        </div>

        {loading && (
          <Card shadow="none" className="border border-divider">
            <CardBody className="py-6">
              <Progress isIndeterminate size="sm" aria-label="Loading…" className="max-w-xs" />
            </CardBody>
          </Card>
        )}

        {error && (
          <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
            {error}
          </div>
        )}

        {post && (
          <>
            {/* Post name + status */}
            <div className="flex items-start gap-2">
              <p className="flex-1 text-sm font-medium leading-snug">{post.name}</p>
              <Chip size="sm" variant="flat" className="shrink-0 text-xs">
                {post.status}
              </Chip>
            </div>

            {/* Video */}
            {post.renderUrl ? (
              <Card shadow="none" className="overflow-hidden border border-divider">
                <CardBody className="p-0">
                  <video
                    ref={videoRef}
                    src={post.renderUrl}
                    controls
                    playsInline
                    className="w-full"
                    style={{ aspectRatio: '9/16', background: '#000' }}
                  />
                </CardBody>
              </Card>
            ) : (
              <Card shadow="none" className="border border-divider">
                <CardBody className="py-8 text-center text-sm text-default-400">
                  No render available yet.
                </CardBody>
              </Card>
            )}

            {/* Download button */}
            {post.renderUrl && (
              <Button
                color="primary"
                fullWidth
                size="lg"
                onPress={downloadVideo}
                className="font-semibold"
              >
                Download MP4
              </Button>
            )}

            {/* Caption */}
            <Card shadow="none" className="border border-divider">
              <CardBody className="space-y-2 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-default-400">
                    Caption
                  </p>
                  <Button
                    size="sm"
                    variant="flat"
                    color={captionCopied ? 'success' : 'default'}
                    className="h-6 px-2 text-xs"
                    onPress={() => copyText(caption, setCaptionCopied)}
                  >
                    {captionCopied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <Textarea
                  size="sm"
                  minRows={2}
                  value={caption}
                  isReadOnly
                  classNames={{ input: 'text-sm' }}
                />
              </CardBody>
            </Card>

            {/* Tags */}
            <Card shadow="none" className="border border-divider">
              <CardBody className="space-y-2 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-default-400">
                    Tags
                  </p>
                  <Button
                    size="sm"
                    variant="flat"
                    color={tagsCopied ? 'success' : 'default'}
                    className="h-6 px-2 text-xs"
                    onPress={() => copyText(tagsText, setTagsCopied)}
                  >
                    {tagsCopied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                <Textarea
                  size="sm"
                  minRows={2}
                  value={tagsText || 'No tags set.'}
                  isReadOnly
                  classNames={{ input: 'text-sm' }}
                />
              </CardBody>
            </Card>

            {/* Beats reference */}
            <Card shadow="none" className="border border-divider">
              <CardBody className="space-y-1 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-default-400">
                  Beats
                </p>
                {[post.beat1, post.beat2, post.beat3, post.beat4]
                  .filter(Boolean)
                  .map((b, i) => (
                    <p key={i} className="text-sm text-default-700">{b}</p>
                  ))}
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
