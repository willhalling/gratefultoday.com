/**
 * lib/renderer/overlays/layouts/tiktok-shared.ts — the TikTok layout's
 * colour/text resolution shared by the world (zones, imprints) and the
 * overlay (AnimatedHook, lyric band). Ports TikTokLayout.tsx:85–166.
 */
import { ensureContrast } from '@/lib/theme-colors';
import { hexToRgb } from '@/lib/renderer/vendor/three/colourGrade';
import type { ThemeConfig } from '@/constants/themes';

export const TIKTOK_TOP_ZONE = 420;
export const TIKTOK_MIDDLE_ZONE = 900;
export const TIKTOK_BOTTOM_ZONE_START = TIKTOK_TOP_ZONE + TIKTOK_MIDDLE_ZONE; // 1320
export const TIKTOK_IMPRINT_SIZE = 180;
export const TIKTOK_IMPRINT_TOP = 142;
export const TIKTOK_IMPRINT_RIGHT = 96;
export const TIKTOK_HOOK_LEFT = 90;
export const TIKTOK_HOOK_MAX_WIDTH = 620;
export const TIKTOK_HOOK_MIN_WIDTH = 360;
export const TIKTOK_HOOK_FONT_SIZE = 44;
export const TIKTOK_CREDIT_LEAD_SEC = 2.5;
export const TIKTOK_CREDIT_FONT_SIZE = 24;
export const TIKTOK_CREDIT_MAX_WIDTH = 560;
/** Bottom-zone karaoke band top offset (TikTokLayout.tsx:311). */
export const TIKTOK_BAND_TOP_OFFSET = 40;
/** Lyrics fade-out window once the outro credit appears (TikTokLayout.tsx:301). */
export const TIKTOK_LYRIC_FADE_FRAMES = 10;

/**
 * RoughClip's single typeface for the three TikTok text roles
 * (remotion/layouts/tikTokType.ts). Role weights are offsets around a
 * mood-derived anchor (hook = anchor+100 cap 900, lyrics = anchor, credit =
 * anchor−100 floor 300); the choreography engine that derives the anchor is
 * NOT ported, so we pin the static anchor 600 → hook 700 / lyrics 600 /
 * credit 500.
 */
export const TIKTOK_FONT_FAMILY = 'TikTok Sans';
export const TIKTOK_HOOK_FONT_WEIGHT = 700;
export const TIKTOK_LYRICS_FONT_WEIGHT = 600;
export const TIKTOK_CREDIT_FONT_WEIGHT = 500;

/** nbsp-join the last two words (widow protection, TikTokLayout.tsx:107–113). */
export function widowJoin(text: string): string {
  const t = text.trim();
  if (!t) return '';
  const parts = t.split(/\s+/);
  if (parts.length < 3) return t;
  return `${parts.slice(0, -2).join(' ')} ${parts.slice(-2).join(' ')}`;
}

export interface TikTokFrameStyle {
  solidColor: string;
  solidRgb: [number, number, number];
  hookColor: string;
}

/** TikTokLayout.tsx:85–103 — frame colour + AA-contrasted hook colour. */
export function resolveTikTokFrameStyle(
  theme: ThemeConfig,
  frameColor?: string,
  frameTextColor?: string,
): TikTokFrameStyle {
  const solidColor = frameColor ?? (theme.background.value || '#000000');
  const hookColor = ensureContrast(
    solidColor,
    frameTextColor ?? (theme.textColor || '#ffffff'),
    4.5,
  );
  const match = solidColor.match(/#[0-9a-fA-F]{6}/);
  return {
    solidColor,
    solidRgb: hexToRgb(match ? match[0] : '#000000'),
    hookColor,
  };
}

/** Designer-aware hook box width (TikTokLayout.tsx:118–133). Metrics default
 * to the canonical 1080×1920 values; pass frame-scaled ones at other sizes. */
export function hookMaxWidth(
  hook: string,
  wordCount: number,
  metrics?: { hookFontSize: number; hookMinWidth: number; hookMaxWidth: number },
): number {
  const fontSize = metrics?.hookFontSize ?? TIKTOK_HOOK_FONT_SIZE;
  const minWidth = metrics?.hookMinWidth ?? TIKTOK_HOOK_MIN_WIDTH;
  const maxWidth = metrics?.hookMaxWidth ?? TIKTOK_HOOK_MAX_WIDTH;
  if (wordCount === 0) return maxWidth;
  const targetLines =
    wordCount <= 4 ? 1 : wordCount <= 8 ? 2 : wordCount <= 13 ? 3 : 4;
  const wordsPerLine = Math.ceil(wordCount / targetLines);
  const avgCharsPerWord = hook.trim().length / wordCount;
  const avgWordWidthPx = avgCharsPerWord * fontSize * 0.55 + fontSize * 0.35;
  const desiredWidth = avgWordWidthPx * wordsPerLine * 1.1;
  return Math.min(maxWidth, Math.max(minWidth, desiredWidth));
}

/** "ARTIST — TRACK" outro credit text (TikTokLayout.tsx:140–144). */
export function creditText(mainText: string, subText: string): string {
  const artist = (subText ?? '').trim();
  const track = (mainText ?? '').trim();
  return [artist, track].filter(Boolean).join(' — ').toUpperCase();
}

/** Credit visibility gate (TikTokLayout.tsx:148). */
export function showCreditAt(
  credit: string,
  frame: number,
  fps: number,
  durationInFrames: number,
): boolean {
  return credit.length > 0 && frame >= durationInFrames - Math.round(fps * TIKTOK_CREDIT_LEAD_SEC);
}

/** Vertical centre of the artwork imprint band — the hook block is vertically
 * centred on it (TikTokLayout.tsx:527–529, AnimatedHook centerBand). */
export const TIKTOK_HOOK_BAND_CENTRE = TIKTOK_IMPRINT_TOP + TIKTOK_IMPRINT_SIZE / 2;

/**
 * Every px metric above is canonical at 1080×1920. The engine renders
 * previews at reduced resolutions (540×960 / 270×480), where unscaled
 * constants break the layout: zoneBottomPx 1320 exceeds the frame height, the
 * middle artwork zone collapses/pushes off-frame, and hook/imprint draw
 * oversized. Scale every px metric by frameHeight/1920 — at 1080×1920 the
 * factor is exactly 1, so full-resolution renders are bit-identical.
 */
export interface TikTokMetrics {
  scale: number;
  topZone: number;
  bottomZoneStart: number;
  imprintSize: number;
  imprintTop: number;
  imprintRight: number;
  /** Vertical centre of the imprint band (hook centring anchor). */
  imprintBandCentre: number;
  hookLeft: number;
  hookFontSize: number;
  hookMinWidth: number;
  hookMaxWidth: number;
  /** AnimatedHook's per-word slide-in distance (8px at 1080×1920). */
  hookWordSlidePx: number;
  creditFontSize: number;
  creditMaxWidth: number;
  creditTopOffset: number;
  bandTopOffset: number;
}

export function tiktokMetrics(frameHeight: number): TikTokMetrics {
  const scale = frameHeight / 1920;
  return {
    scale,
    topZone: TIKTOK_TOP_ZONE * scale,
    bottomZoneStart: TIKTOK_BOTTOM_ZONE_START * scale,
    imprintSize: TIKTOK_IMPRINT_SIZE * scale,
    imprintTop: TIKTOK_IMPRINT_TOP * scale,
    imprintRight: TIKTOK_IMPRINT_RIGHT * scale,
    imprintBandCentre: TIKTOK_HOOK_BAND_CENTRE * scale,
    hookLeft: TIKTOK_HOOK_LEFT * scale,
    hookFontSize: TIKTOK_HOOK_FONT_SIZE * scale,
    hookMinWidth: TIKTOK_HOOK_MIN_WIDTH * scale,
    hookMaxWidth: TIKTOK_HOOK_MAX_WIDTH * scale,
    hookWordSlidePx: 8 * scale,
    creditFontSize: TIKTOK_CREDIT_FONT_SIZE * scale,
    creditMaxWidth: TIKTOK_CREDIT_MAX_WIDTH * scale,
    creditTopOffset: 28 * scale,
    bandTopOffset: TIKTOK_BAND_TOP_OFFSET * scale,
  };
}

/** Outro handoff (TikTokLayout.tsx:300–304): when the credit pops in for the
 * final 2.5 s, the subtitle band fades out over 10 frames and the credit
 * takes the band. 1 = lyrics, 0 = handed to the credit. */
export function lyricHandoffOpacity(
  credit: string,
  frame: number,
  fps: number,
  durationInFrames: number,
): number {
  if (!showCreditAt(credit, frame, fps, durationInFrames)) return 1;
  const creditStartFrame = durationInFrames - Math.round(fps * TIKTOK_CREDIT_LEAD_SEC);
  return Math.max(0, 1 - (frame - creditStartFrame) / TIKTOK_LYRIC_FADE_FRAMES);
}
