/**
 * lib/renderer/overlays/layouts/types.ts — shared argument bag for the
 * Canvas2D layout ports. Values come from frame-context statics + frameArgs;
 * geometry comments cite the source layout components.
 */
import type { ThemeConfig } from '@/constants/themes';
import type { VisualizerPreset } from '@/constants/visualizers';
import type { SocialLinksData } from '@/types/social';
import type { SubtitleConfig } from '@/lib/renderer/types';
import type { PreparedImprints } from '../../imprints';
import type { VisualizerSlot } from '../../visualizers';

export interface LoadedImage {
  img: CanvasImageSource;
  width: number;
  height: number;
}

/** Phase 1.5 lyric-mode renderer slot — layouts call it with the band's
 * resolved geometry; absent/undefined when there are no lyrics. */
export type LyricBandDrawFn = (
  ctx: CanvasRenderingContext2D,
  band: {
    left: number;
    top: number;
    width: number;
    height: number;
    compositionHeight: number;
    bandTop: number;
  },
) => void;

export interface LayoutArgs {
  width: number;
  height: number;
  isPortrait: boolean;
  theme: ThemeConfig;
  fontFamily: string;
  mainText: string;
  subText: string;
  /** Social hook (TikTok layout only). */
  hook: string;
  /** Composition's textLockupActive — layouts hide their own mainText/subText
   * (the lockup imprint/overlay carries them). */
  textLockupActive: boolean;
  socialLinks?: SocialLinksData;
  coverImage: LoadedImage | null;
  preset: VisualizerPreset;
  /** Composition fps (per-frame animation math). */
  fps: number;
  /** Composition length in frames (outro-credit timing on the TikTok layout). */
  durationInFrames: number;
  isPodcast: boolean;
  isThumbnail: boolean;
  colourGradeIntensity: number;
  /** TikTok frame overrides (visualStyle.tiktokFrame*). */
  frameColor?: string;
  frameTextColor?: string;
  animateHook?: boolean;
  subtitle: SubtitleConfig;
  /** 128-bin spectrum for this frame (visualizers + the vinyl record's
   * bass-reactive float). */
  frequencyData: ArrayLike<number>;
  /** Prepared imprints (1.3) — the lockup overlay raster for
   * cinematic/lower-third, watermark badge raster is NOT needed (the DOM
   * badge is drawn directly). */
  imprints?: PreparedImprints | null;
  /** Lyric-mode slot — Phase 1.5. */
  lyricBand?: LyricBandDrawFn | null;
  /** Visualizer slot — Phase 1.6 (null when preset is 'none'). */
  visualizer?: VisualizerDrawFn | null;
  /** Phase 1.7 fx overlays (grain/sparkles/dust/vignette) — layouts call this
   * at the DOM stacking point of FxOverlays: after their z-index:auto content,
   * before any explicit-z-index element. The orchestrator draws whatever the
   * layout leaves uncalled after the whole layout (idempotent). */
  fxOverlays?: ((ctx: CanvasRenderingContext2D) => void) | null;
}

export type LayoutDrawFn = (ctx: CanvasRenderingContext2D, args: LayoutArgs, frame: number) => void;

/** Phase 1.6 visualizer slot — layouts call it with the slot's resolved DOM
 * geometry + per-layout styling; the orchestrator binds preset/FFT/energy
 * per frame. */
export type VisualizerDrawFn = (ctx: CanvasRenderingContext2D, slot: VisualizerSlot) => void;
