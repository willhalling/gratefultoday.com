/**
 * Convert a string to a URL-friendly slug
 * @param text - The text to slugify
 * @returns A slugified string with only lowercase letters, numbers, and hyphens
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a short unique suffix for IDs
 * Uses base36 timestamp + random suffix for uniqueness
 * @returns A short unique suffix (e.g., "mlr4i0z6")
 */
export function generateShortId(): string {
  const timestamp = Date.now().toString(36); // Base36 for shorter string
  const random = Math.random().toString(36).substring(2, 6); // 4 random chars
  return `${timestamp}${random}`;
}

/**
 * Generate a unique document ID from song/album information
 * @param mainText - Main text (e.g., song title)
 * @param subText - Sub text (e.g., artist name)
 * @returns A unique document ID like "summer-vibe-mlr4i0z6" (text + short unique suffix)
 */
export function generateDocId(mainText?: string, subText?: string): string {
  const parts: string[] = [];

  if (mainText && mainText.trim()) {
    parts.push(slugify(mainText));
  }

  if (subText && subText.trim()) {
    parts.push(slugify(subText));
  }

  // Add short unique suffix to ensure uniqueness
  const uniqueSuffix = generateShortId();

  // If no text was provided, use a descriptive prefix
  if (parts.length === 0) {
    parts.push('video');
  }

  parts.push(uniqueSuffix);

  return parts.join('-');
}

/**
 * Generate a unique video ID from video name
 * @param name - Video name (e.g., "My Summer Vibes")
 * @returns A unique video ID like "my-summer-vibes-mlr4i0z6"
 */
export function generateVideoId(name: string): string {
  const slug = slugify(name || 'video');
  const uniqueSuffix = generateShortId();
  return `${slug}-${uniqueSuffix}`;
}

/**
 * Generate a filename from song/album information
 * @param mainText - Main text (e.g., song title)
 * @param subText - Sub text (e.g., artist name)
 * @param fallback - Fallback filename if no text is provided
 * @param orientation - Optional orientation suffix ('landscape' | 'portrait')
 * @returns A slugified filename
 */
export function generateFilename(
  mainText: string,
  subText: string,
  fallback: string,
  orientation?: 'landscape' | 'portrait',
): string {
  const parts: string[] = [];

  if (mainText && mainText.trim()) {
    parts.push(slugify(mainText));
  }

  if (subText && subText.trim()) {
    parts.push(slugify(subText));
  }

  const base = parts.length > 0 ? parts.join('-') : fallback;
  return orientation ? `${base}-${orientation}` : base;
}
