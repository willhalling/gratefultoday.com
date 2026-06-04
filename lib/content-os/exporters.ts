import type { ContentOsPost } from '@/types/content-os';

export const SINGLE_JSON_NOTES = [
  'Required: beats (array of 2-4 short strings).',
  'name = output filename stem; ignored - output is gt-<today>.mp4 with -v2/-v3 if needed.',
  'background (optional) = absolute path, or filename inside assets/backgrounds/, or assets/. If omitted, a random background is chosen.',
  'music (optional) = absolute path, or filename inside assets/music/, or assets/. If omitted, video is silent unless --music is passed.',
  'Rename _optional_music -> music to enable it.',
] as const;

const BULK_JSON_NOTES = [
  'Bulk render file. Each entry has the same fields as single.json.',
  'Curate by flipping enabled to false (or adding skip: true) - that entry is skipped.',
  'Run with: ./.venv/bin/python -m gratitude_videos.app --bulk gratitude_videos/bulk.json',
  'Required per entry: beats (2-4 short strings).',
  'Optional: name (output filename stem), background, music, enabled.',
  'If background is omitted, one is picked from assets/backgrounds/approved (incl. videos/ + images/ subfolders), without repeats inside one run.',
  'Output: gratitude_videos/output/.mp4 (collisions get -v2/-v3 suffix).',
] as const;

function beatsFromPost(post: ContentOsPost): string[] {
  return [post.beat1, post.beat2, post.beat3, post.beat4]
    .map((b) => (b || '').trim())
    .filter(Boolean)
    .slice(0, 4);
}

export function buildSingleJson(post: ContentOsPost): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: post.name,
    beats: beatsFromPost(post),
    _notes: [...SINGLE_JSON_NOTES],
  };

  if (post.background?.trim()) {
    payload.background = post.background.trim();
  }
  if (post.music?.trim()) {
    payload.music = post.music.trim();
  }

  return payload;
}

export function buildBulkJson(posts: ContentOsPost[]): Record<string, unknown> {
  const mapped = posts.map((post) => {
    const item: Record<string, unknown> = {
      name: post.name,
      enabled: true,
      beats: beatsFromPost(post),
    };
    if (post.background?.trim()) {
      item.background = post.background.trim();
    }
    if (post.music?.trim()) {
      item.music = post.music.trim();
    }
    return item;
  });

  return {
    _notes: [...BULK_JSON_NOTES],
    posts: mapped,
  };
}
