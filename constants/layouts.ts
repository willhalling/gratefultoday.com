/**
 * Layout registry — the single source of truth for every video layout.
 *
 * Pure data only (no React imports) so `constants/themes.ts` and generation
 * prompts can consume it. The id → component map lives in
 * `remotion/layouts/index.ts`.
 *
 * Adding a new layout:
 *   1. Add the id to LAYOUT_IDS and an entry to LAYOUT_REGISTRY below.
 *   2. Create the component in `remotion/layouts/`.
 *   3. Map the id to the component in `remotion/layouts/index.ts`.
 * The drawer picker, admin select, compatibility locking and the composition
 * resolver all update automatically.
 */

export const LAYOUT_IDS = [
  'header',
  'centered',
  'full-bleed',
  'floating-card',
  'fullscreen',
  'minimal',
  'cinematic',
  'corner-pocket',
  'center-stage',
  'split',
  'split-reverse',
  'editorial',
  'lower-third',
  'vinyl',
  'tiktok',
] as const;

export type LayoutId = (typeof LAYOUT_IDS)[number];

/**
 * Creative character of a layout. Used by tag-based pickers to select
 * layouts by intent instead of hardcoded ids.
 *   hero      — cover-forward: the artwork IS the video
 *   editorial — magazine typography over/beside the artwork
 *   vinyl     — vinyl / full-bleed record character
 *   minimal   — type/visualizer only, no artwork
 *   classic   — broadcast/poster framing, lyric-friendly
 *   social    — native-social framing (TikTok): hook + imprint + lyric world
 */
export type LayoutCharacter = 'hero' | 'editorial' | 'vinyl' | 'minimal' | 'classic' | 'social';

export interface LayoutMeta {
  id: LayoutId;
  label: string;
  description: string;
  /** Layout has a lyric band/slot and can render subtitles. */
  supportsLyrics: boolean;
  /** Layout needs cover artwork to look right. */
  requiresArtwork: boolean;
  /** Layout works with scene-pack (AI scene) backgrounds. */
  supportsScenes: boolean;
  orientations: readonly ('landscape' | 'portrait')[];
  /** Creative character tag — see LayoutCharacter. */
  character?: LayoutCharacter;
  /** Shows a "New" badge in the picker. */
  isNew?: boolean;
  /** Hidden layouts are kept out of the pickers (they filter on `meta.hidden`)
   *  but are still honoured by resolveLayoutId when explicitly requested —
   *  pack-only layouts (e.g. TikTok) are set programmatically, never picked. */
  hidden?: boolean;
  order: number;
}

export const LAYOUT_REGISTRY: readonly LayoutMeta[] = [
  {
    id: 'header',
    label: 'Poster',
    description: 'Header strip with title & artwork, lyrics take centre stage.',
    supportsLyrics: true,
    requiresArtwork: false,
    supportsScenes: true,
    orientations: ['landscape', 'portrait'],
    character: 'classic',
    order: 0,
  },
  {
    id: 'centered',
    label: 'Centered',
    description: 'Artwork stacked above your text — portrait classic.',
    supportsLyrics: false,
    requiresArtwork: true,
    supportsScenes: false,
    orientations: ['landscape', 'portrait'],
    character: 'hero',
    order: 1,
  },
  {
    id: 'full-bleed',
    label: 'Full Bleed',
    description: 'Blurred full-frame artwork with the cover floating on top.',
    supportsLyrics: false,
    requiresArtwork: true,
    supportsScenes: false,
    // Legacy behavior rendered BlurredLayout in portrait too when explicitly
    // chosen — keep both so old videos are unchanged.
    orientations: ['landscape', 'portrait'],
    character: 'vinyl',
    order: 2,
  },
  {
    id: 'floating-card',
    label: 'Floating Card',
    description: 'Text and visualizer beside a large artwork card.',
    supportsLyrics: false,
    requiresArtwork: true,
    supportsScenes: false,
    orientations: ['landscape', 'portrait'],
    character: 'hero',
    order: 3,
  },
  {
    id: 'fullscreen',
    label: 'Fullscreen',
    description: 'Just the visualizer and your text — no artwork needed.',
    supportsLyrics: false,
    requiresArtwork: false,
    supportsScenes: false,
    orientations: ['landscape', 'portrait'],
    character: 'minimal',
    order: 4,
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Typography only — small title, lyrics centre stage.',
    supportsLyrics: true,
    requiresArtwork: false,
    supportsScenes: false,
    orientations: ['landscape', 'portrait'],
    character: 'minimal',
    isNew: true,
    order: 10,
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    description: 'Letterbox bars with lyrics in the lower third.',
    supportsLyrics: true,
    requiresArtwork: false,
    supportsScenes: false,
    orientations: ['landscape', 'portrait'],
    character: 'classic',
    isNew: true,
    order: 11,
  },
  {
    id: 'corner-pocket',
    label: 'Corner Pocket',
    description: 'Small artwork tucked in the corner — lyrics get the stage.',
    supportsLyrics: true,
    requiresArtwork: true,
    supportsScenes: false,
    orientations: ['landscape', 'portrait'],
    character: 'editorial',
    isNew: true,
    order: 12,
  },
  {
    id: 'center-stage',
    label: 'Centre Stage',
    description: 'Large centred artwork with a lyric band below.',
    supportsLyrics: true,
    requiresArtwork: true,
    supportsScenes: false,
    orientations: ['landscape', 'portrait'],
    character: 'hero',
    isNew: true,
    order: 13,
  },
  {
    id: 'split',
    label: 'Split Screen',
    description: 'Artwork on one side, text and lyrics on the other.',
    supportsLyrics: true,
    requiresArtwork: true,
    supportsScenes: false,
    orientations: ['landscape', 'portrait'],
    character: 'editorial',
    isNew: true,
    order: 14,
  },
  {
    id: 'split-reverse',
    label: 'Split Screen (Reversed)',
    description: 'Text and lyrics on one side, artwork on the other.',
    supportsLyrics: true,
    requiresArtwork: true,
    supportsScenes: false,
    orientations: ['landscape', 'portrait'],
    character: 'editorial',
    isNew: true,
    order: 15,
  },
  {
    id: 'editorial',
    label: 'Editorial',
    description: 'Magazine style — big title over the artwork, lyrics lower-left.',
    supportsLyrics: true,
    requiresArtwork: true,
    supportsScenes: false,
    orientations: ['landscape', 'portrait'],
    character: 'editorial',
    isNew: true,
    order: 15,
  },
  {
    id: 'lower-third',
    label: 'Lower Third',
    description: 'Broadcast-style title bar with lyrics floating above it.',
    supportsLyrics: true,
    requiresArtwork: false,
    supportsScenes: false,
    orientations: ['landscape', 'portrait'],
    character: 'classic',
    isNew: true,
    order: 16,
  },
  {
    id: 'vinyl',
    label: 'Vinyl',
    description: 'Slowly spinning artwork with text beside it.',
    supportsLyrics: false,
    requiresArtwork: true,
    supportsScenes: false,
    orientations: ['landscape', 'portrait'],
    character: 'vinyl',
    isNew: true,
    order: 17,
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    description:
      'Native-social frame: hook + small artwork imprint, karaoke lyrics in the bottom frame band.',
    supportsLyrics: true,
    requiresArtwork: false,
    supportsScenes: false,
    orientations: ['portrait'],
    character: 'social',
    isNew: true,
    hidden: true,
    order: 18,
  },
];

const BY_ID: ReadonlyMap<LayoutId, LayoutMeta> = new Map(
  LAYOUT_REGISTRY.map((m) => [m.id, m]),
);

export const getLayoutMeta = (id: LayoutId): LayoutMeta => {
  const meta = BY_ID.get(id);
  if (!meta) throw new Error(`Unknown layout id: ${id}`);
  return meta;
};

export const DEFAULT_LAYOUT_ID: LayoutId = 'header';

/** Content context used to decide whether a layout can be used. */
export interface LayoutContext {
  hasLyrics: boolean;
  hasCoverImage: boolean;
  hasSceneImages: boolean;
  isPortrait: boolean;
  /** Theme prefers a blurred backdrop — legacy default picks Full Bleed. */
  useBlurredBackground?: boolean;
}

/**
 * Human-readable reason a layout is unavailable in this context, or null when
 * it can be used. Shared by the drawer picker (disabled cards) and the
 * composition resolver (fallback selection).
 */
export function getLayoutBlockReason(
  meta: LayoutMeta,
  ctx: LayoutContext,
): string | null {
  if (meta.hidden) {
    return 'No longer available';
  }
  if (ctx.hasSceneImages && !meta.supportsScenes) {
    return 'Not available with scene videos';
  }
  if (ctx.hasLyrics && !meta.supportsLyrics) {
    return 'Not available with lyrics';
  }
  if (!ctx.hasCoverImage && meta.requiresArtwork) {
    return 'Needs cover art';
  }
  if (!meta.orientations.includes(ctx.isPortrait ? 'portrait' : 'landscape')) {
    return ctx.isPortrait ? 'Landscape only' : 'Portrait only';
  }
  return null;
}

export function isLayoutCompatible(meta: LayoutMeta, ctx: LayoutContext): boolean {
  return getLayoutBlockReason(meta, ctx) === null;
}

/**
 * Deterministic fallback when the requested layout can't be used.
 * Mirrors the previous hardcoded behaviour in VisualizerComposition:
 * lyrics/scenes → Poster, nothing on screen → Fullscreen, portrait → Centered,
 * blurred themes → Full Bleed (handled by caller), else Floating Card.
 */
export function resolveFallbackLayout(ctx: LayoutContext): LayoutId {
  if (ctx.hasLyrics || ctx.hasSceneImages) return 'header';
  if (!ctx.hasCoverImage) return 'fullscreen';
  if (ctx.isPortrait) return 'centered';
  if (ctx.useBlurredBackground) return 'full-bleed';
  return 'floating-card';
}

/** Type guard for values read from Firestore. */
export function isLayoutId(value: unknown): value is LayoutId {
  return typeof value === 'string' && BY_ID.has(value as LayoutId);
}

/** Legacy ids that predate the registry — used to preserve old render behavior. */
const LEGACY_LAYOUT_IDS: readonly LayoutId[] = [
  'header',
  'centered',
  'full-bleed',
  'floating-card',
];

/**
 * Decide which layout to render.
 *
 * - An explicit, compatible choice always wins.
 * - Legacy edge case preserved: with no content at all (no cover, no scenes,
 *   no lyrics) and no explicit *new* layout chosen, render Fullscreen — this
 *   is how videos rendered before the registry existed.
 * - Otherwise fall back deterministically (see resolveFallbackLayout).
 */
export function resolveLayoutId(
  requested: unknown,
  ctx: LayoutContext,
): LayoutId {
  const hasNoContent = !ctx.hasCoverImage && !ctx.hasSceneImages && !ctx.hasLyrics;
  const valid = isLayoutId(requested) ? requested : undefined;

  if (hasNoContent && (!valid || LEGACY_LAYOUT_IDS.includes(valid))) {
    return 'fullscreen';
  }
  if (valid) {
    const meta = getLayoutMeta(valid);
    // Hidden layouts are picker-hidden but renderable when explicitly set
    // (pack-only) — the remaining context rules still apply.
    if (isLayoutCompatible(meta.hidden ? { ...meta, hidden: false } : meta, ctx)) {
      return valid;
    }
  }
  return resolveFallbackLayout(ctx);
}
