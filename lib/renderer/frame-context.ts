/**
 * lib/renderer/frame-context.ts — the Remotion-free equivalent of the
 * per-frame derivation `VisualizerComposition` + `useVisualizerSetup` do at
 * render time. Everything here is a pure function of the input props + the
 * offline audio analysis; no React, no hooks, no remotion, no wall clock.
 *
 * Source mapping (line numbers refer to remotion/VisualizerComposition.tsx
 * and remotion/hooks/useVisualizerSetup.ts at the time of porting):
 *
 *   resolveCompositionConfig — Root.tsx:735–756 calculateMetadata for the
 *     VisualizerComposition (fps 30|60, duration*fps ceil, orientation,
 *     4k doubling — ported faithfully even though 4k isn't editor-exposed).
 *   resolveTheme/fontFamily  — remotion/hooks/useResolvedTheme.ts:28–63.
 *   createFrameContext statics:
 *     proxied URLs :458–474 · backgroundBlur :462 · effectiveSubtitle
 *     :476–480 · preset (directorMode→'none') :487 · lyric shift :507–511 ·
 *     word/phrase trim-rebase :512–579 · directorImages :583–592 ·
 *     effectiveHookPreset :599–600 · background URL chain :684–750 ·
 *     activeMotionEffect :757–765 · grade resolution :773–792 · camera
 *     :794–799 · effectiveTheme (light-bg text shadow) :806–812 · hasLyrics
 *     :814–817 · layoutId :850–868 · TikTok fx filter :872–877 · hook :879 ·
 *     artist lockup :895–969 (placement only; texture rasterisation is the
 *     Phase 1.3 imprints layer) · watermark placement :1044–1080 ·
 *     webglSingleImageBackground :1124–1130 · hook hold :1142–1152 · audio
 *     placement + duck constants :1513–1564 · background branch priority
 *     (renderBackground) :1162–1485 · scrims :1602–1616.
 *   frameArgs(frame):
 *     audioVolume envelope (useVisualizerSetup.ts:146–162) · hook duck
 *     (:1549–1564) · frequencyData (:187–189 → analysis) ·
 *     backgroundWaveEnergy (:196–199 → analysis) · motionWaveEnergy
 *     (:766–768) · overallEnergy (:842–848) · hook-opening animations
 *     (:602–682) · debugActiveWord (:820–834).
 *
 * Audio timeline: the analysis is aligned to the COMPOSITION timeline at
 * offset 0 — the original calls visualizeAudio without dataOffsetInSeconds,
 * so the visuals sample the untrimmed file at composition time even when
 * audioTrim shifts what you hear (see audio-engine.ts header). The
 * trim/lead-in math controlling what you hear is exposed as
 * `audioPlacement` (:1521–1534): source-time at composition frame f is
 * f/fps + (newStartSec − missingLeadInSec)… i.e. f/fps + trimStart −
 * desiredLeadInSec. The mux layer consumes this; nothing here re-bases the
 * visual analysis.
 *
 * Deferred to later phases (not derived here):
 *   - DepthGalleryBackground internals (scene image cycling, Ken Burns,
 *     choreography, MusicTimeline sampling) — Phase 1.2 world-renderer.
 *     musicTimeline/intensityCurve are carried through as opaque inputs.
 *   - Watermark/artist-mark TEXTURE rasterisation (canvas) — Phase 1.3
 *     imprints; only the placement inputs/visibility flags are resolved here.
 *   - MusicTimeline is passed to the depth gallery verbatim; the
 *     composition itself never samples it per frame.
 */
import { getThemeById, DEFAULT_THEME_ID, type ThemeConfig } from '@/constants/themes';
import { THEME_FONTS } from '@/constants/fonts';
import { visualStyleToThemeConfig } from '@/lib/visual-style';
import { resolveLayoutId, type LayoutId } from '@/constants/layouts';
import { GRADE_PRESETS, hexToRgb } from '@/lib/renderer/vendor/three/colourGrade';
import { cssBackgroundToDataUrl } from '@/lib/renderer/vendor/three/cssBackgroundTexture';
import type { CameraMotion } from '@/lib/renderer/vendor/three/camera/cameraMotion';
import { getWatermarkPlacement, type WatermarkPlacement } from '@/lib/renderer/vendor/layouts/watermarkPlacement';
import {
  getArtistLockupPlacement,
  type ArtistLockupPlacement,
} from '@/lib/renderer/vendor/layouts/artistMarkPlacement';
import { proxyImageUrl, proxyImageUrls } from '@/lib/proxy-image';
import type { MusicTimeline } from '@/lib/audio-analysis';
import type { WordTiming, SubtitleConfig } from '@/lib/renderer/types';
import type { LyricPhrase } from '@/lib/renderer/vendor/slots/lyricPhrase';
import type { VisualizerCompositionProps } from '@/lib/renderer/props';
import type { VisualizerPreset } from '@/constants/visualizers';
import type { ClipAudioFrameData } from './audio-engine';
import { Easing, interpolate } from './timing';

/** VisualizerComposition.tsx:314 — fixed ripple amplitude (maps to uWave). */
export const BACKGROUND_WAVE_CONSTANT = 2.2;

/** VisualizerComposition.tsx:1549 — music bed level under the hook hold. */
export const HOOK_DUCK_VOLUME = 0.25;

// ─── Composition config (Root.tsx:735–756) ──────────────────────────────────

export interface CompositionConfig {
  fps: number;
  durationInFrames: number;
  width: number;
  height: number;
}

/**
 * Port of the VisualizerComposition calculateMetadata (Root.tsx:735–756).
 * fps is 30 only when explicitly 30, else 60; duration defaults 10s;
 * '4k' doubles the orientation base (1080×1920 / 1920×1080).
 */
export function resolveCompositionConfig(
  props: VisualizerCompositionProps,
): CompositionConfig {
  const fps = props.fps === 30 ? 30 : 60;
  const duration = typeof props.duration === 'number' ? props.duration : 10;
  const durationInFrames = Math.ceil(duration * fps);
  const is4k = props.resolution === '4k';
  const baseWidth = props.orientation === 'landscape' ? 1920 : 1080;
  const baseHeight = props.orientation === 'landscape' ? 1080 : 1920;
  return {
    fps,
    durationInFrames,
    width: is4k ? baseWidth * 2 : baseWidth,
    height: is4k ? baseHeight * 2 : baseHeight,
  };
}

// ─── Theme resolution (useResolvedTheme.ts:28–63) ───────────────────────────

function resolveTheme(props: VisualizerCompositionProps): ThemeConfig {
  let base: ThemeConfig;
  if (props.visualStyle) {
    base = visualStyleToThemeConfig(props.visualStyle);
  } else if (props.theme === 'custom' && props.customThemeConfig) {
    base = props.customThemeConfig;
  } else {
    base =
      getThemeById(props.theme ?? DEFAULT_THEME_ID) ??
      getThemeById(DEFAULT_THEME_ID)!;
  }
  // An explicitly empty overlayEffects array means the user turned all
  // overlays off, so it must override the theme's own overlay settings.
  if (props.overlayEffects !== undefined) {
    return { ...base, overlayEffects: props.overlayEffects };
  }
  if (!props.overlayEffect) return base;
  return { ...base, overlayEffect: props.overlayEffect };
}

function resolveFontFamily(theme: ThemeConfig): string {
  const fontName = THEME_FONTS[theme.font]?.name ?? 'system-ui';
  return `'${fontName}', 'Arial Unicode MS', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif`;
}

/** VisualizerComposition.tsx:353–358 — first hex colour of a CSS background. */
function gradeBackgroundHex(value: string): string {
  const clean = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(clean)) return clean;
  const match = clean.match(/#[0-9a-fA-F]{6}/);
  return match ? match[0] : '#000000';
}

// ─── Background branch resolution (renderBackground :1162–1485) ─────────────

export type BackgroundBranch =
  | 'scene-video' // 1. looping scene mp4 (:1190)
  | 'background-video' // 2. user/theme background video (:1201)
  | 'scene-pack' // 3. theme scene-pack depth gallery (:1215)
  | 'scene-images' // 4. AI wizard scene images depth gallery (:1223)
  | 'single-image' // 5. single image / colour texture (:1238)
  | 'none';

export type BackgroundSubBranch =
  | 'motion-effect' // 5a. pulse/rgb-glitch/rain/dream (:1272)
  | 'grade-atmosphere' // 5a-ii. standalone colour-grade (:1373)
  | 'wave' // 5b. steady wave ripple (:1404)
  | 'camera' // 5c. static image + camera rig (:1432)
  | 'default-grade' // 5d. default colour-grade scene (:1461)
  | 'flat' // 5e. flat still image (:1484)
  | null;

// ─── Frame context ───────────────────────────────────────────────────────────

export interface AudioPlacement {
  originalStartSec: number;
  desiredLeadInSec: number;
  availableLeadInSec: number;
  missingLeadInSec: number;
  newStartSec: number;
  startFromFrames: number | null;
  endAtFrames: number | null;
  audioSequenceFrom: number;
  /** Source-audio seconds heard at composition frame f:
   * f/fps + audioSourceOffsetSec (newStartSec − missingLeadInSec =
   * trimStart − desiredLeadInSec). */
  audioSourceOffsetSec: number;
}

export interface FrameContextInput {
  props: VisualizerCompositionProps;
  /** Defaults to resolveCompositionConfig(props). */
  config?: CompositionConfig;
  /** Per-frame analysis aligned to the composition timeline (offset 0) with
   * totalFrames === config.durationInFrames. */
  analysis: ClipAudioFrameData;
  /** Injectable for non-DOM environments (parity harness): produces the
   * generated colour/gradient texture. Defaults to the real
   * cssBackgroundToDataUrl (which returns null outside the DOM). */
  generateColourBackgroundUrl?: typeof cssBackgroundToDataUrl;
}

export interface FrameArgs {
  frame: number;
  /** Fade-out envelope only (useVisualizerSetup.ts:146–162). */
  audioVolume: number;
  /** Hook-hold duck factor (:1549–1563). */
  duckFactor: number;
  /** audioVolume × duckFactor — the <Audio>/Html5Audio volume (:1564). */
  effectiveVolume: number;
  /** 128-bin spectrum for this frame (:187–189). */
  frequencyData: Float32Array;
  /** Gaussian bass × waveEnergyMultiplier, clamped ≤1 (:196–199). */
  backgroundWaveEnergy: number;
  /** Raw Gaussian bass, only when a motion effect is active (:766–768). */
  motionWaveEnergy: number;
  /** RMS of the 128 bins, /0.15, clamped ≤1 (:842–848). */
  overallEnergy: number;
  // ── Hook-opening animations (:602–682) ──
  hookMinimalBlackOpacity: number;
  hookMinimalScale: number;
  hookSubtleAmberOpacity: number;
  hookSubtleScale: number;
  hookSubtleVignette: number;
  hookImpactScale: number;
  hookImpactFlash: number;
  hookImpactVignette: number;
  hookAggressiveScale: number;
  hookAggressiveRedFlash: number;
  hookAggressiveWhiteFlash: number;
  hookAggressiveShakeX: number;
  hookAggressiveVignette: number;
  hookCinematicScale: number;
  hookCinematicBarHeight: number;
  hookCinematicGrayscale: number;
  hookCinematicVignette: number;
  /** Unified content-wrapper scale (:669–675). */
  hookPushScale: number;
  /** Unified content-wrapper translateX (:676–677). */
  hookShakeX: number;
  /** Content-wrapper CSS filter (:679–682). */
  hookContentFilter: string | null;
  /** Active spoken word for the debug overlay (:820–834). */
  debugActiveWord: string | null;
}

export interface FrameContext {
  props: VisualizerCompositionProps;
  config: CompositionConfig;
  analysis: ClipAudioFrameData;

  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  isPortrait: boolean;

  theme: ThemeConfig;
  effectiveTheme: ThemeConfig;
  fontFamily: string;
  effectiveSubtitle: SubtitleConfig;
  preset: VisualizerPreset;

  lyricHoldShift: number;
  lyricShift: number;
  effectiveLyricsWords: WordTiming[] | undefined;
  effectiveLyricsLines: LyricPhrase[] | undefined;
  hasLyrics: boolean;

  // ── Background URL chain (:684–750) ──
  proxiedCoverImageUrl: string | null;
  proxiedImageUrl: string | null | undefined;
  proxiedBlurredBackgroundUrl: string | null;
  proxiedPosterBackgroundUrl: string | null;
  proxiedSceneImages: string[] | undefined;
  backgroundBlur: number;
  hasCoverImage: boolean;
  effectiveImageUrl: string | null;
  effectiveBackgroundVideoUrl: string | null;
  scenePackLayers: string[] | null;
  hasBgImage: boolean;
  effectiveBgUrl: string | null;
  colourBackgroundUrl: string | null;
  shaderBgUrl: string | null;
  fallbackBgUrl: string | null;
  lyricsBackgroundImageUrl: string | null;
  directorImages: string[] | undefined;

  // ── Motion / grade / camera (:752–799) ──
  activeMotionEffect: 'pulse' | 'rgb-glitch' | 'rain' | 'dream' | 'colour-grade' | null;
  gradePreset: (typeof GRADE_PRESETS)[number];
  gradeBrandBackground: [number, number, number];
  gradeBrandAccent: [number, number, number];
  gradeBrandText: [number, number, number];
  cameraDurationInFrames: number;
  activeCameraMotion: CameraMotion | null;

  // ── Layout / overlays (:850–884) ──
  hasSceneImages: boolean;
  layoutId: LayoutId;
  isTikTokLayout: boolean;
  fxOverlayEffects: ThemeConfig['overlayEffects'];
  fxOverlayEffect: ThemeConfig['overlayEffect'];
  effectiveHook: string;
  coverImprintActive: false;

  // ── Artist lockup (:895–969) ──
  artistMarkActive: boolean;
  lockupHasTitle: boolean;
  lockupHasName: boolean;
  lockupContent: boolean;
  lockupPlacement: ArtistLockupPlacement;
  lockupOverlayOnly: boolean;

  // ── Watermark (:1044–1080) ──
  watermarkPlacement: WatermarkPlacement;
  watermarkImprinted: boolean;
  webglSingleImageBackground: boolean;

  // ── Hook hold + audio placement (:1132–1564) ──
  effectiveHookPreset: NonNullable<VisualizerCompositionProps['hookOpeningPreset']>;
  /** The clipHook prop itself — the held intro card's content (Phase 1.8;
   *  not part of the parity dump). */
  clipHook: VisualizerCompositionProps['clipHook'] | null;
  holdFrames: number;
  voEndFrames: number;
  duckRampFrames: number;
  audioPlacement: AudioPlacement;

  // ── Background branch (renderBackground :1162–1485) ──
  backgroundBranch: BackgroundBranch;
  backgroundSubBranch: BackgroundSubBranch;
  flatImageKind: 'blurred-scene' | 'safe-img' | null;

  /**
   * Cut-world plan (scene-images branch only): the beat-driven cut schedule
   * + shot→pool-item mapping + impact choreography events, resolved once per
   * render from the seeded pool (lib/aesthetics/cut-schedule.ts). Null for
   * every other branch.
   */
  cutWorld: {
    schedule: CutWorldSchedule;
    choreoEvents: CutWorldChoreoEvent[];
    /** Resolved grammar cutIntensity (drives the per-cut punch strength). */
    cutIntensity: number;
  } | null;

  // ── Scrims (:1602–1616) ──
  darkScrimVisible: boolean;
  overlayGradientVisible: boolean;

  frameArgs: (frame: number) => FrameArgs;
}

export function createFrameContext(input: FrameContextInput): FrameContext {
  const { props, analysis } = input;
  const config = input.config ?? resolveCompositionConfig(props);
  const generateColourBackgroundUrl =
    input.generateColourBackgroundUrl ?? cssBackgroundToDataUrl;
  const { fps, width, height, durationInFrames } = config;
  const isPortrait = height > width; // useVisualizerSetup.ts:168

  // Destructuring defaults — VisualizerComposition.tsx:360–427.
  const imageUrl = props.imageUrl;
  const proxyImagesForPreview = props.proxyImagesForPreview ?? false;
  const presetInput = props.preset ?? 'bars';
  const mainText = props.mainText ?? '';
  const subText = props.subText ?? '';
  const coverImageUrl = props.coverImageUrl ?? null;
  const blurredBackgroundUrl = props.blurredBackgroundUrl ?? null;
  const posterBackgroundUrl = props.posterBackgroundUrl ?? null;
  const isThumbnail = props.isThumbnail ?? false;
  const showLyrics = props.showLyrics ?? false;
  const lyricsWords = props.lyricsWords;
  const lyricsLines = props.lyricsLines;
  const subtitle = props.subtitle ?? { mode: 'kinetic' as const, size: 'medium' as const };
  const subtitleMode = props.subtitleMode;
  const subtitleSize = props.subtitleSize;
  const customThemeConfig = props.customThemeConfig;
  const visualStyle = props.visualStyle;
  const artworkLayoutOverride = props.artworkLayout;
  const backgroundVideoUrl = props.backgroundVideoUrl ?? null;
  const sceneVideoUrl = props.sceneVideoUrl ?? null;
  const sceneImages = props.sceneImages;
  const waveEnergyMultiplier = props.waveEnergyMultiplier ?? 1;
  const motionEffect = props.motionEffect ?? 'none';
  const motionEffectScale = props.motionEffectScale ?? 1;
  const colourGradeIntensity = props.colourGradeIntensity ?? 0.5;
  const colourGradePreset = props.colourGradePreset ?? 'original';
  const allowMotionPreview = props.allowMotionPreview ?? false;
  const cameraMotion = props.cameraMotion ?? 'static';
  const audioTrim = props.audioTrim ?? null;
  const hookOpeningPreset = props.hookOpeningPreset;
  const fullDurationInFrames = props.fullDurationInFrames;
  const directorMode = props.directorMode ?? false;
  const clipHook = props.clipHook ?? null;
  const artistLogoUrl = props.artistLogoUrl ?? null;
  const artistLogoScale = props.artistLogoScale;
  const artistLogoDisplay = props.artistLogoDisplay;
  const showDebug = props.showDebug ?? false;
  const audioBpm = props.audioBpm;

  // useResolvedTheme (useResolvedTheme.ts:28–63).
  const theme = resolveTheme(props);
  const fontFamily = resolveFontFamily(theme);

  // Proxied URLs (:458–474).
  const proxiedCoverImageUrl = proxyImageUrl(coverImageUrl, proxyImagesForPreview);
  const proxiedImageUrl = proxyImageUrl(imageUrl, proxyImagesForPreview);
  const proxiedBlurredBackgroundUrl = proxyImageUrl(blurredBackgroundUrl, proxyImagesForPreview);
  const proxiedPosterBackgroundUrl = proxyImageUrl(posterBackgroundUrl, proxyImagesForPreview);
  const backgroundBlur = visualStyle?.backgroundBlur ?? 0; // :462
  const proxiedCustomThemeConfig = customThemeConfig
    ? {
        ...customThemeConfig,
        backgroundImageUrl: proxyImageUrl(
          customThemeConfig.backgroundImageUrl,
          proxyImagesForPreview,
        ),
        scenePackImages: proxyImageUrls(
          customThemeConfig.scenePackImages,
          proxyImagesForPreview,
        ),
      }
    : undefined;
  const proxiedSceneImages = proxyImageUrls(sceneImages, proxyImagesForPreview);

  // :476–480.
  const effectiveSubtitle: SubtitleConfig = {
    mode: subtitleMode ?? subtitle.mode,
    size: subtitleSize ?? subtitle.size,
    overlay: subtitle.overlay,
  };

  // :487 — director mode forces the visualizer off.
  const preset: VisualizerPreset = directorMode ? 'none' : presetInput;

  // ── Lyric trim safety net + shifts (:497–579) ──
  const lyricHoldShift = clipHook ? Math.max(0, clipHook.holdSec) : 0; // :507
  const lyricShift = lyricHoldShift + (visualStyle?.lyricOffsetSeconds ?? 0); // :511

  const effectiveLyricsWords = ((): WordTiming[] | undefined => {
    // :512–544.
    if (!audioTrim || !lyricsWords?.length) {
      if (lyricShift !== 0 && lyricsWords?.length) {
        return lyricsWords.map((w) => {
          const s = Math.max(0, w.start + lyricShift);
          return { ...w, start: s, end: Math.max(s, w.end + lyricShift) };
        });
      }
      return lyricsWords;
    }
    const windowLen = audioTrim.end - audioTrim.start;
    const maxStart = lyricsWords[lyricsWords.length - 1]?.start ?? 0;
    const alreadyTrimmed = maxStart <= windowLen + 1;
    const { start: trimStart, end: trimEnd } = audioTrim;
    const out: WordTiming[] = [];
    if (alreadyTrimmed) {
      for (const w of lyricsWords) {
        const s = Math.max(0, w.start + lyricShift);
        out.push({ ...w, start: s, end: Math.max(s, w.end + lyricShift) });
      }
      return out;
    }
    for (const w of lyricsWords) {
      if (w.end <= trimStart) continue;
      if (w.start >= trimEnd) break;
      const s = Math.max(0, w.start - trimStart);
      const e = Math.max(s, Math.min(trimEnd - trimStart, w.end - trimStart));
      const ss = Math.max(0, s + lyricShift);
      out.push({ ...w, start: ss, end: Math.max(ss, e + lyricShift) });
    }
    return out;
  })();

  const effectiveLyricsLines = ((): LyricPhrase[] | undefined => {
    // :546–579.
    if (!audioTrim || !lyricsLines?.length) {
      if (lyricShift !== 0 && lyricsLines?.length) {
        return lyricsLines.map((l) => {
          const s = Math.max(0, l.start + lyricShift);
          return { ...l, start: s, end: Math.max(s, l.end + lyricShift) };
        });
      }
      return lyricsLines;
    }
    const windowLen = audioTrim.end - audioTrim.start;
    const maxStart = lyricsLines[lyricsLines.length - 1]?.start ?? 0;
    const alreadyTrimmed = maxStart <= windowLen + 1;
    const { start: trimStart, end: trimEnd } = audioTrim;
    const out: LyricPhrase[] = [];
    if (alreadyTrimmed) {
      for (const l of lyricsLines) {
        const s = Math.max(0, l.start + lyricShift);
        out.push({ ...l, start: s, end: Math.max(s, l.end + lyricShift) });
      }
      return out;
    }
    for (const l of lyricsLines) {
      if (l.end <= trimStart) continue;
      if (l.start >= trimEnd) break;
      const s = Math.max(0, l.start - trimStart + lyricShift);
      out.push({
        ...l,
        start: s,
        end: Math.max(s, Math.min(trimEnd - trimStart, l.end - trimStart) + lyricShift),
      });
    }
    return out;
  })();

  // :583–592.
  const directorImages =
    proxiedSceneImages && proxiedSceneImages.length > 0
      ? proxiedSceneImages
      : proxiedImageUrl
        ? [proxiedImageUrl]
        : proxiedPosterBackgroundUrl
          ? [proxiedPosterBackgroundUrl]
          : proxiedCoverImageUrl
            ? [proxiedCoverImageUrl]
            : undefined;

  // :599–600.
  const effectiveHookPreset: NonNullable<VisualizerCompositionProps['hookOpeningPreset']> =
    hookOpeningPreset ?? 'none';

  // ── Background URL chain (:684–750) ──
  const hasCoverImage = !!proxiedCoverImageUrl; // :684
  const effectiveImageUrl =
    proxiedImageUrl || proxiedCustomThemeConfig?.backgroundImageUrl || null; // :688
  const effectiveBackgroundVideoUrl =
    backgroundVideoUrl || proxiedCustomThemeConfig?.backgroundVideoUrl || null; // :689
  const scenePackLayers =
    !isThumbnail &&
    (proxiedCustomThemeConfig?.backgroundType === 'scene-pack' ||
      (proxiedCustomThemeConfig?.scenePackImages?.length ?? 0) >= 2)
      ? proxiedCustomThemeConfig!.scenePackImages!
      : null; // :695–700
  const hasBgImage = !!effectiveImageUrl; // :701
  const effectiveBgUrl =
    proxiedCustomThemeConfig?.backgroundType === 'solid' ||
    proxiedCustomThemeConfig?.backgroundType === 'gradient'
      ? effectiveImageUrl
      : effectiveImageUrl || proxiedBlurredBackgroundUrl || proxiedPosterBackgroundUrl || null; // :706–710
  const colourBackgroundUrl = effectiveBgUrl
    ? null
    : generateColourBackgroundUrl(theme.background.value, width, height, {
        accentColor: theme.accentColor,
      }); // :717–725
  const shaderBgUrl = effectiveBgUrl ?? colourBackgroundUrl; // :726
  const fallbackBgUrl =
    proxiedImageUrl &&
    proxiedCustomThemeConfig?.backgroundImageUrl &&
    proxiedCustomThemeConfig.backgroundImageUrl !== effectiveBgUrl
      ? proxiedCustomThemeConfig.backgroundImageUrl
      : null; // :735–740
  const lyricsBackgroundImageUrl =
    effectiveBgUrl ??
    (scenePackLayers && scenePackLayers.length > 0 ? scenePackLayers[0] : null) ??
    (proxiedSceneImages && proxiedSceneImages.length > 0 ? proxiedSceneImages[0] : null); // :747–750

  // ── Motion / grade / camera (:752–799) ──
  const activeMotionEffect =
    (motionEffect === 'pulse' ||
      motionEffect === 'rgb-glitch' ||
      motionEffect === 'rain' ||
      motionEffect === 'dream' ||
      motionEffect === 'colour-grade') &&
    motionEffectScale > 0
      ? motionEffect
      : null; // :757–765
  const gradePreset =
    GRADE_PRESETS.find((p) => p.id === colourGradePreset) ?? GRADE_PRESETS[0]; // :773–774
  const gradeBrandBackground = hexToRgb(gradeBackgroundHex(theme.background.value)); // :775
  const gradeBrandAccent = hexToRgb(gradeBackgroundHex(theme.accentColor)); // :776
  const gradeBrandText = hexToRgb(gradeBackgroundHex(theme.textColor)); // :777
  const cameraDurationInFrames = fullDurationInFrames ?? durationInFrames; // :797–798
  const activeCameraMotion = cameraMotion !== 'static' && !isThumbnail ? cameraMotion : null; // :799

  // :806–812.
  const effectiveTheme =
    hasBgImage && theme.lightBackground
      ? {
          ...theme,
          textShadow: '0 2px 16px rgba(0,0,0,0.9), 0 1px 4px rgba(0,0,0,0.8)',
        }
      : theme;

  // :814–817.
  const hasLyrics =
    showLyrics &&
    ((Array.isArray(effectiveLyricsWords) && effectiveLyricsWords.length > 0) ||
      (Array.isArray(effectiveLyricsLines) && effectiveLyricsLines.length > 0));

  // ── Layout / overlays (:850–884) ──
  const hasSceneImages = (proxiedSceneImages?.length ?? 0) > 0 || !!scenePackLayers; // :856–857
  const layoutId = resolveLayoutId(artworkLayoutOverride ?? effectiveTheme.artworkLayout, {
    hasLyrics,
    hasCoverImage,
    hasSceneImages,
    isPortrait,
    useBlurredBackground: !!effectiveTheme.useBlurredBackground,
  }); // :858–864
  const isTikTokLayout = layoutId === 'tiktok'; // :868
  const fxOverlayEffects = isTikTokLayout
    ? effectiveTheme.overlayEffects?.filter((e) => e !== 'sparkles')
    : effectiveTheme.overlayEffects; // :872–874
  const fxOverlayEffect =
    isTikTokLayout && effectiveTheme.overlayEffect === 'sparkles'
      ? 'none'
      : effectiveTheme.overlayEffect; // :875–877
  const effectiveHook = props.hook ?? visualStyle?.hook ?? ''; // :879
  const coverImprintActive = false as const; // :884

  // ── Artist lockup (:895–949; placement only — rasterisation is Phase 1.3) ──
  const artistMarkActive = !!artistLogoUrl && (artistLogoDisplay ?? 'logo') === 'logo'; // :895
  const lockupHasTitle = !!mainText; // :902
  const lockupHasName = !!subText && !artistMarkActive; // :903
  const lockupContent = artistMarkActive || lockupHasTitle || lockupHasName; // :904
  const lockupPlacement = getArtistLockupPlacement({
    layoutId,
    width,
    height,
    isPortrait,
    hasCoverImage,
    scale: artistLogoScale ?? 1,
    hasLogo: artistMarkActive,
    hasTitle: lockupHasTitle,
    hasName: lockupHasName,
  }); // :905–917
  const lockupOverlayOnly = layoutId === 'cinematic' || layoutId === 'lower-third'; // :949

  // ── Watermark (:1044–1080) ──
  const watermarkPlacement = getWatermarkPlacement({
    layoutId,
    width,
    height,
    isPortrait,
    hasCoverImage,
  }); // :1044–1050
  const watermarkImprinted = watermarkPlacement.type === 'edge'; // :1080

  // :1124–1130.
  const webglSingleImageBackground =
    !!shaderBgUrl &&
    (!isThumbnail || allowMotionPreview) &&
    !sceneVideoUrl &&
    !effectiveBackgroundVideoUrl &&
    !scenePackLayers &&
    !(proxiedSceneImages && proxiedSceneImages.length >= 1 && !hasBgImage);

  // ── Hook hold + audio placement (:1132–1564) ──
  const holdFrames = clipHook ? Math.max(0, Math.round(clipHook.holdSec * fps)) : 0; // :1142
  const voEndFrames =
    clipHook?.voiceoverDurationSec && clipHook.voiceoverDurationSec > 0
      ? Math.min(holdFrames, Math.max(1, Math.round(clipHook.voiceoverDurationSec * fps)))
      : holdFrames; // :1149–1152

  // :1521–1534.
  const originalStartSec = audioTrim ? Math.max(0, audioTrim.start) : 0;
  const desiredLeadInSec = clipHook ? Math.max(0, clipHook.holdSec) : 0;
  const availableLeadInSec = Math.min(desiredLeadInSec, originalStartSec);
  const missingLeadInSec = desiredLeadInSec - availableLeadInSec;
  const newStartSec = audioTrim ? originalStartSec - availableLeadInSec : 0;
  const startFromFrames = audioTrim ? Math.round(newStartSec * fps) : null;
  const endAtFrames = audioTrim
    ? Math.max(startFromFrames ?? 0, Math.round(audioTrim.end * fps))
    : null;
  const audioSequenceFrom = Math.round(missingLeadInSec * fps);
  const audioPlacement: AudioPlacement = {
    originalStartSec,
    desiredLeadInSec,
    availableLeadInSec,
    missingLeadInSec,
    newStartSec,
    startFromFrames,
    endAtFrames,
    audioSequenceFrom,
    audioSourceOffsetSec: newStartSec - missingLeadInSec,
  };

  const duckRampFrames = Math.max(1, Math.round(0.8 * fps)); // :1550

  // ── Background branch (renderBackground :1162–1485) ──
  const thumbnailShadersOff = isThumbnail && !allowMotionPreview;
  const backgroundBranch: BackgroundBranch = sceneVideoUrl
    ? 'scene-video'
    : effectiveBackgroundVideoUrl
      ? 'background-video'
      : scenePackLayers
        ? 'scene-pack'
        : proxiedSceneImages && proxiedSceneImages.length >= 1 && !hasBgImage
          ? 'scene-images'
          : !shaderBgUrl
            ? 'none'
            : 'single-image';
  const backgroundSubBranch: BackgroundSubBranch =
    backgroundBranch !== 'single-image'
      ? null
      : activeMotionEffect && activeMotionEffect !== 'colour-grade' && !thumbnailShadersOff
        ? 'motion-effect' // 5a :1272
        : activeMotionEffect === 'colour-grade' && !thumbnailShadersOff
          ? 'grade-atmosphere' // 5a-ii :1373
          : waveEnergyMultiplier > 0 && !thumbnailShadersOff
            ? 'wave' // 5b :1404
            : activeCameraMotion
              ? 'camera' // 5c :1432
              : !thumbnailShadersOff
                ? 'default-grade' // 5d :1461
                : 'flat'; // 5e :1484
  const flatImageKind =
    backgroundBranch === 'single-image'
      ? backgroundBlur > 0 && !thumbnailShadersOff
        ? 'blurred-scene' // :1246
        : 'safe-img' // :1259
      : null;

  // ── Cut-world plan (scene-images branch — the Aesthetics cut world) ──────
  // Resolves the media pool + beat-driven cut schedule + impact choreography
  // ONCE per render (seeded, deterministic). sceneVideos / aestheticEditing
  // are read from the flat props first, then from visualStyle (the
  // VisualizerSettings seam the Aesthetics tab writes).
  const cutWorld = ((): FrameContext['cutWorld'] => {
    if (backgroundBranch !== 'scene-images' || !proxiedSceneImages) return null;
    const vsExtras = visualStyle as
      | (typeof visualStyle & {
          sceneVideos?: string[];
          aestheticEditing?: {
            shotDurationBeats: number[];
            cutIntensity: number;
            transitions?: ('cut' | 'flash' | 'crossfade')[];
          };
        })
      | undefined;
    const sceneVideos = props.sceneVideos ?? vsExtras?.sceneVideos;
    const aestheticEditing = props.aestheticEditing ?? vsExtras?.aestheticEditing;
    const proxiedSceneVideos = proxyImageUrls(sceneVideos, proxyImagesForPreview);
    const timeline = props.musicTimeline ?? null;
    const durationSec = cameraDurationInFrames / fps;
    const schedule = buildCutWorldSchedule({
      images: proxiedSceneImages,
      videos: proxiedSceneVideos,
      durationSec,
      // MusicTimeline beats are richer (analysis-derived); both are
      // composition-relative seconds (scene-director.ts convention).
      beats: timeline?.beats?.length ? timeline.beats : (props.audioBeats ?? []),
      bpm: props.audioBpm,
      intensityCurve: props.intensityCurve,
      grammar: aestheticEditing,
      // Cut on the drop: strong impacts always get a cut.
      impacts: timeline?.impacts,
    });
    const choreoEvents = buildCutWorldChoreo(timeline?.impacts, durationSec);
    return {
      schedule,
      choreoEvents,
      cutIntensity: aestheticEditing?.cutIntensity ?? 0.5,
    };
  })();

  // ── Scrims (:1602–1616) ──
  const darkScrimVisible =
    (hasBgImage || !!effectiveBgUrl) &&
    !!theme.lightBackground &&
    !directorMode &&
    colourGradeIntensity > 0; // :1607
  const overlayGradientVisible =
    colourGradeIntensity > 0 && !!theme.overlayGradient && theme.overlayGradient !== 'none'; // :1614

  // ─── Per-frame derivation ──────────────────────────────────────────────────

  const frameArgs = (frame: number): FrameArgs => {
    // audioVolume fade-out envelope (useVisualizerSetup.ts:146–162).
    let audioVolume = 1;
    {
      const fadeAudio = props.fadeAudio ?? false;
      if (fadeAudio && durationInFrames && fps) {
        const totalSec = durationInFrames / fps;
        if (totalSec > 0) {
          const requestedFadeSec =
            props.fadeOutSec && props.fadeOutSec > 0 ? props.fadeOutSec : 1;
          const fadeSec = Math.min(requestedFadeSec, totalSec);
          const fadeStartSec = Math.max(0, totalSec - fadeSec);
          const currentSec = frame / fps;
          if (currentSec >= fadeStartSec) {
            audioVolume = interpolate(currentSec, [fadeStartSec, totalSec], [1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
          }
        }
      }
    }

    // Hook-hold duck (:1549–1563).
    let duckFactor = 1;
    if (holdFrames > 0) {
      if (frame < Math.max(0, holdFrames - duckRampFrames)) {
        duckFactor = HOOK_DUCK_VOLUME;
      } else if (frame < holdFrames) {
        duckFactor = interpolate(
          frame,
          [Math.max(0, holdFrames - duckRampFrames), holdFrames],
          [HOOK_DUCK_VOLUME, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        );
      }
    }
    const effectiveVolume = audioVolume * duckFactor; // :1564

    // Audio-reactive data (analysis is pre-computed on the composition
    // timeline; see header note).
    const clampedFrame = Math.min(Math.max(0, frame), analysis.totalFrames - 1);
    const frequencyData =
      analysis.frequencyData[clampedFrame] ?? new Float32Array(128); // :187–189
    const backgroundWaveEnergy =
      analysis.backgroundWaveEnergy[clampedFrame] ?? 0; // :196–199
    const motionWaveEnergy = activeMotionEffect
      ? (analysis.rawBackgroundWaveEnergy[clampedFrame] ?? 0)
      : 0; // :766–768

    // :842–848.
    let overallEnergy = 0.5;
    if (frequencyData && frequencyData.length > 0) {
      let sum = 0;
      for (let i = 0; i < frequencyData.length; i++) sum += frequencyData[i] * frequencyData[i];
      overallEnergy = Math.min(1, Math.sqrt(sum / frequencyData.length) / 0.15);
    }

    // ── Hook-opening animations (:602–682) ──
    const clampLR = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
    const hookMinimalBlackOpacity =
      effectiveHookPreset === 'minimal'
        ? interpolate(frame, [0, 20], [1, 0], { ...clampLR, easing: Easing.out(Easing.quad) })
        : 0; // :603
    const hookMinimalScale =
      effectiveHookPreset === 'minimal'
        ? interpolate(frame, [0, 22], [1.015, 1], { ...clampLR, easing: Easing.out(Easing.cubic) })
        : 1; // :607
    const hookSubtleAmberOpacity =
      effectiveHookPreset === 'subtle'
        ? interpolate(frame, [0, 3, 18], [0, 0.22, 0], clampLR)
        : 0; // :611
    const hookSubtleScale =
      effectiveHookPreset === 'subtle'
        ? interpolate(frame, [0, 16], [1.03, 1], { ...clampLR, easing: Easing.out(Easing.cubic) })
        : 1; // :614
    const hookSubtleVignette =
      effectiveHookPreset === 'subtle'
        ? interpolate(frame, [0, 22], [0.28, 0], { ...clampLR, easing: Easing.out(Easing.quad) })
        : 0; // :617
    const hookImpactScale =
      effectiveHookPreset === 'impact'
        ? interpolate(frame, [0, 8], [1.075, 1], { ...clampLR, easing: Easing.out(Easing.cubic) })
        : 1; // :622
    const hookImpactFlash =
      effectiveHookPreset === 'impact'
        ? interpolate(frame, [0, 2, 7], [0.32, 0.12, 0], clampLR)
        : 0; // :625
    const hookImpactVignette =
      effectiveHookPreset === 'impact'
        ? interpolate(frame, [0, 24], [0.5, 0], { ...clampLR, easing: Easing.out(Easing.quad) })
        : 0; // :628
    const hookAggressiveScale =
      effectiveHookPreset === 'aggressive'
        ? interpolate(frame, [0, 5], [1.12, 1], { ...clampLR, easing: Easing.out(Easing.cubic) })
        : 1; // :633
    const hookAggressiveRedFlash =
      effectiveHookPreset === 'aggressive'
        ? interpolate(frame, [0, 2, 4, 6], [0.45, 0.22, 0.1, 0], clampLR)
        : 0; // :637
    const hookAggressiveWhiteFlash =
      effectiveHookPreset === 'aggressive'
        ? interpolate(frame, [2, 3, 5], [0, 0.3, 0], clampLR)
        : 0; // :641
    const hookAggressiveShakeX =
      effectiveHookPreset === 'aggressive'
        ? ([0, -6, 5, -3, 2, 0][Math.min(frame, 5)] ?? 0)
        : 0; // :645
    const hookAggressiveVignette =
      effectiveHookPreset === 'aggressive'
        ? interpolate(frame, [0, 18], [0.65, 0], { ...clampLR, easing: Easing.out(Easing.quad) })
        : 0; // :648
    const hookCinematicScale =
      effectiveHookPreset === 'cinematic'
        ? interpolate(frame, [0, 45], [1.06, 1], { ...clampLR, easing: Easing.out(Easing.quad) })
        : 1; // :653
    const hookCinematicBarHeight =
      effectiveHookPreset === 'cinematic'
        ? interpolate(frame, [0, 30], [0.12, 0], { ...clampLR, easing: Easing.inOut(Easing.cubic) })
        : 0; // :657
    const hookCinematicGrayscale =
      effectiveHookPreset === 'cinematic'
        ? interpolate(frame, [0, 22], [0.85, 0], { ...clampLR, easing: Easing.out(Easing.quad) })
        : 0; // :661
    const hookCinematicVignette =
      effectiveHookPreset === 'cinematic'
        ? interpolate(frame, [0, 40], [0.4, 0], { ...clampLR, easing: Easing.out(Easing.quad) })
        : 0; // :664

    // :669–682.
    const hookPushScale =
      effectiveHookPreset === 'minimal'
        ? hookMinimalScale
        : effectiveHookPreset === 'subtle'
          ? hookSubtleScale
          : effectiveHookPreset === 'impact'
            ? hookImpactScale
            : effectiveHookPreset === 'aggressive'
              ? hookAggressiveScale
              : effectiveHookPreset === 'cinematic'
                ? hookCinematicScale
                : 1;
    const hookShakeX = effectiveHookPreset === 'aggressive' ? hookAggressiveShakeX : 0;
    const hookContentFilter =
      effectiveHookPreset === 'cinematic' && hookCinematicGrayscale > 0
        ? `grayscale(${hookCinematicGrayscale})`
        : null;

    // Debug overlay — active spoken word (:820–834).
    let debugActiveWord: string | null = null;
    if (showDebug) {
      const words = effectiveLyricsWords ?? [];
      const t = frame / fps + 0.15;
      for (let i = words.length - 1; i >= 0; i--) {
        const w = words[i];
        if (w.start <= t && w.end > t) {
          debugActiveWord = w.word;
          break;
        }
      }
      if (debugActiveWord === null) {
        for (let i = words.length - 1; i >= 0; i--) {
          const w = words[i];
          if (w.end <= t && t - w.end < 0.3) {
            debugActiveWord = w.word;
            break;
          }
        }
      }
    }

    return {
      frame,
      audioVolume,
      duckFactor,
      effectiveVolume,
      frequencyData,
      backgroundWaveEnergy,
      motionWaveEnergy,
      overallEnergy,
      hookMinimalBlackOpacity,
      hookMinimalScale,
      hookSubtleAmberOpacity,
      hookSubtleScale,
      hookSubtleVignette,
      hookImpactScale,
      hookImpactFlash,
      hookImpactVignette,
      hookAggressiveScale,
      hookAggressiveRedFlash,
      hookAggressiveWhiteFlash,
      hookAggressiveShakeX,
      hookAggressiveVignette,
      hookCinematicScale,
      hookCinematicBarHeight,
      hookCinematicGrayscale,
      hookCinematicVignette,
      hookPushScale,
      hookShakeX,
      hookContentFilter,
      debugActiveWord,
    };
  };

  return {
    props,
    config,
    analysis,
    fps,
    width,
    height,
    durationInFrames,
    isPortrait,
    theme,
    effectiveTheme,
    fontFamily,
    effectiveSubtitle,
    preset,
    lyricHoldShift,
    lyricShift,
    effectiveLyricsWords,
    effectiveLyricsLines,
    hasLyrics,
    proxiedCoverImageUrl,
    proxiedImageUrl,
    proxiedBlurredBackgroundUrl,
    proxiedPosterBackgroundUrl,
    proxiedSceneImages,
    backgroundBlur,
    hasCoverImage,
    effectiveImageUrl,
    effectiveBackgroundVideoUrl,
    scenePackLayers,
    hasBgImage,
    effectiveBgUrl,
    colourBackgroundUrl,
    shaderBgUrl,
    fallbackBgUrl,
    lyricsBackgroundImageUrl,
    directorImages,
    activeMotionEffect,
    gradePreset,
    gradeBrandBackground,
    gradeBrandAccent,
    gradeBrandText,
    cameraDurationInFrames,
    activeCameraMotion,
    hasSceneImages,
    layoutId,
    isTikTokLayout,
    fxOverlayEffects,
    fxOverlayEffect,
    effectiveHook,
    coverImprintActive,
    artistMarkActive,
    lockupHasTitle,
    lockupHasName,
    lockupContent,
    lockupPlacement,
    lockupOverlayOnly,
    watermarkPlacement,
    watermarkImprinted,
    webglSingleImageBackground,
    effectiveHookPreset,
    clipHook,
    holdFrames,
    voEndFrames,
    duckRampFrames,
    audioPlacement,
    backgroundBranch,
    backgroundSubBranch,
    flatImageKind,
    cutWorld,
    darkScrimVisible,
    overlayGradientVisible,
    frameArgs,
  };
}

// ─── Parity dump ─────────────────────────────────────────────────────────────

/**
 * The JSON shape diffed by scripts/parity/frame-context-parity.ts. KEEP IN
 * SYNC with the dev-only dump assembly in remotion/VisualizerComposition.tsx
 * (search `__parityDump`) — same keys, same order of normalisation.
 *
 * `data:` URLs (the generated colour/gradient texture) are normalised to
 * '__DATA_URL__' on both sides: the canvas rasterisation is verified by the
 * Phase 1.2 pixel tests, not by string equality here.
 */
export interface FrameContextDump {
  static: Record<string, unknown>;
  frame: Record<string, unknown>;
}

function normalizeUrl(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.startsWith('data:') ? '__DATA_URL__' : value;
}

function normalizeUrlArray(value: string[] | null | undefined): string[] | null {
  if (!value) return null;
  return value.map((v) => normalizeUrl(v) as string);
}

/** Serialisable dump of the static resolutions + one frame's derived values. */
export function dumpFrameContext(ctx: FrameContext, frame: number): FrameContextDump {
  const a = ctx.frameArgs(frame);
  const p = ctx.props;
  return {
    static: {
      fps: ctx.fps,
      width: ctx.width,
      height: ctx.height,
      durationInFrames: ctx.durationInFrames,
      isPortrait: ctx.isPortrait,
      fontFamily: ctx.fontFamily,
      effectiveSubtitle: ctx.effectiveSubtitle,
      preset: ctx.preset,
      lyricHoldShift: ctx.lyricHoldShift,
      lyricShift: ctx.lyricShift,
      words: ctx.effectiveLyricsWords ?? null,
      lines: ctx.effectiveLyricsLines ?? null,
      hasLyrics: ctx.hasLyrics,
      themeSummary: {
        backgroundValue: ctx.theme.background.value,
        textColor: ctx.theme.textColor,
        accentColor: ctx.theme.accentColor,
        font: ctx.theme.font,
        lightBackground: !!ctx.theme.lightBackground,
        artworkLayout: ctx.theme.artworkLayout ?? null,
        overlayEffect: ctx.theme.overlayEffect ?? null,
        overlayEffects: ctx.theme.overlayEffects ?? null,
        useBlurredBackground: !!ctx.theme.useBlurredBackground,
        overlayGradient: ctx.theme.overlayGradient ?? null,
        backgroundTexture: ctx.theme.backgroundTexture ?? null,
        textShadowApplied: ctx.effectiveTheme !== ctx.theme,
      },
      proxiedCoverImageUrl: normalizeUrl(ctx.proxiedCoverImageUrl),
      proxiedImageUrl: normalizeUrl(ctx.proxiedImageUrl),
      proxiedBlurredBackgroundUrl: normalizeUrl(ctx.proxiedBlurredBackgroundUrl),
      proxiedPosterBackgroundUrl: normalizeUrl(ctx.proxiedPosterBackgroundUrl),
      proxiedSceneImages: normalizeUrlArray(ctx.proxiedSceneImages),
      backgroundBlur: ctx.backgroundBlur,
      hasCoverImage: ctx.hasCoverImage,
      effectiveImageUrl: normalizeUrl(ctx.effectiveImageUrl),
      effectiveBackgroundVideoUrl: normalizeUrl(ctx.effectiveBackgroundVideoUrl),
      scenePackLayers: normalizeUrlArray(ctx.scenePackLayers),
      hasBgImage: ctx.hasBgImage,
      effectiveBgUrl: normalizeUrl(ctx.effectiveBgUrl),
      colourBackgroundUrl: normalizeUrl(ctx.colourBackgroundUrl),
      shaderBgUrl: normalizeUrl(ctx.shaderBgUrl),
      fallbackBgUrl: normalizeUrl(ctx.fallbackBgUrl),
      lyricsBackgroundImageUrl: normalizeUrl(ctx.lyricsBackgroundImageUrl),
      directorImages: normalizeUrlArray(ctx.directorImages),
      activeMotionEffect: ctx.activeMotionEffect,
      gradePresetId: ctx.gradePreset.id,
      gradeBrandBackground: ctx.gradeBrandBackground,
      gradeBrandAccent: ctx.gradeBrandAccent,
      gradeBrandText: ctx.gradeBrandText,
      gradeParams: {
        lift: ctx.gradePreset.lift,
        gamma: ctx.gradePreset.gamma,
        gain: ctx.gradePreset.gain,
        saturation: ctx.gradePreset.saturation,
        contrast: ctx.gradePreset.contrast,
        grain: ctx.gradePreset.grain,
        intensity: p.colourGradeIntensity ?? 0.5,
      },
      cameraDurationInFrames: ctx.cameraDurationInFrames,
      activeCameraMotion: ctx.activeCameraMotion,
      cameraMotionIntensity: p.cameraMotionIntensity ?? 0.5,
      hasSceneImages: ctx.hasSceneImages,
      layoutId: ctx.layoutId,
      isTikTokLayout: ctx.isTikTokLayout,
      fxOverlayEffects: ctx.fxOverlayEffects ?? null,
      fxOverlayEffect: ctx.fxOverlayEffect ?? null,
      effectiveHook: ctx.effectiveHook,
      artistMarkActive: ctx.artistMarkActive,
      lockupHasTitle: ctx.lockupHasTitle,
      lockupHasName: ctx.lockupHasName,
      lockupContent: ctx.lockupContent,
      lockupPlacement: ctx.lockupPlacement,
      lockupOverlayOnly: ctx.lockupOverlayOnly,
      watermarkPlacement: ctx.watermarkPlacement,
      watermarkImprinted: ctx.watermarkImprinted,
      webglSingleImageBackground: ctx.webglSingleImageBackground,
      effectiveHookPreset: ctx.effectiveHookPreset,
      holdFrames: ctx.holdFrames,
      voEndFrames: ctx.voEndFrames,
      duckRampFrames: ctx.duckRampFrames,
      hookDuckVolume: HOOK_DUCK_VOLUME,
      audioPlacement: ctx.audioPlacement,
      backgroundBranch: ctx.backgroundBranch,
      backgroundSubBranch: ctx.backgroundSubBranch,
      flatImageKind: ctx.flatImageKind,
      // Cut-world dump keys are CONDITIONAL (present only on the scene-images
      // branch) so the pre-cut-world goldens — which never had them — still
      // diff clean.
      ...(ctx.cutWorld
        ? {
            cutWorldSeed: ctx.cutWorld.schedule.seed,
            cutWorldItems: ctx.cutWorld.schedule.items.map(
              (i) => `${i.kind}:${normalizeUrl(i.url)}`,
            ),
            cutWorldCutPointsSec: ctx.cutWorld.schedule.cutPointsSec,
            cutWorldShotItems: ctx.cutWorld.schedule.shotItems,
            cutWorldChoreoEvents: ctx.cutWorld.choreoEvents,
          }
        : {}),
      darkScrimVisible: ctx.darkScrimVisible,
      overlayGradientVisible: ctx.overlayGradientVisible,
      waveEnergyConstant: BACKGROUND_WAVE_CONSTANT,
      waveEnergyMultiplier: p.waveEnergyMultiplier ?? 1,
      motionEffectScale: p.motionEffectScale ?? 1,
      audioBeats: p.audioBeats ?? null,
      beatSnapEnabled: p.beatSnapEnabled ?? false,
      audioBpm: p.audioBpm ?? 120,
      musicTimeline: (p.musicTimeline ?? null) as MusicTimeline | null,
      intensityCurve: p.intensityCurve ?? null,
      imageFadeProgress: 1,
      textFadeProgress: 1,
      coverImageSlideUp: 0,
    },
    frame: {
      frame: a.frame,
      audioVolume: a.audioVolume,
      duckFactor: a.duckFactor,
      effectiveVolume: a.effectiveVolume,
      frequencyData: Array.from(a.frequencyData),
      backgroundWaveEnergy: a.backgroundWaveEnergy,
      motionWaveEnergy: a.motionWaveEnergy,
      overallEnergy: a.overallEnergy,
      hookMinimalBlackOpacity: a.hookMinimalBlackOpacity,
      hookMinimalScale: a.hookMinimalScale,
      hookSubtleAmberOpacity: a.hookSubtleAmberOpacity,
      hookSubtleScale: a.hookSubtleScale,
      hookSubtleVignette: a.hookSubtleVignette,
      hookImpactScale: a.hookImpactScale,
      hookImpactFlash: a.hookImpactFlash,
      hookImpactVignette: a.hookImpactVignette,
      hookAggressiveScale: a.hookAggressiveScale,
      hookAggressiveRedFlash: a.hookAggressiveRedFlash,
      hookAggressiveWhiteFlash: a.hookAggressiveWhiteFlash,
      hookAggressiveShakeX: a.hookAggressiveShakeX,
      hookAggressiveVignette: a.hookAggressiveVignette,
      hookCinematicScale: a.hookCinematicScale,
      hookCinematicBarHeight: a.hookCinematicBarHeight,
      hookCinematicGrayscale: a.hookCinematicGrayscale,
      hookCinematicVignette: a.hookCinematicVignette,
      hookPushScale: a.hookPushScale,
      hookShakeX: a.hookShakeX,
      hookContentFilter: a.hookContentFilter,
      debugActiveWord: a.debugActiveWord,
      ...(ctx.cutWorld
        ? {
            cutWorldShot: shotIndexAtTime(
              a.frame / ctx.fps,
              ctx.cutWorld.schedule.cutPointsSec,
            ),
            cutWorldItem: poolItemAtTime(ctx.cutWorld.schedule, a.frame / ctx.fps),
            cutWorldChoreo: sampleCutWorldChoreo(ctx.cutWorld.choreoEvents, a.frame / ctx.fps),
            cutWorldPunchZoom: cutPunchZoomAt(a.frame / ctx.fps, ctx.cutWorld.schedule.cutPointsSec, {
              cutIntensity: ctx.cutWorld.cutIntensity,
              intensityCurve: p.intensityCurve,
              windowSec: ctx.cameraDurationInFrames / ctx.fps,
              seed: ctx.cutWorld.schedule.seed,
              dropCuts: ctx.cutWorld.schedule.dropCuts,
            }),
          }
        : {}),
    },
  };
}

// ─── World-renderer bridge (Phase 1.2a + 1.2b) ───────────────────────────────

import type {
  WorldBackgroundSource,
  WorldFrameParams,
  WorldSceneKind,
} from './world-renderer';
import type { DepthGalleryAssets } from './depth-gallery';
import type { VideoBackgroundSource } from './video-background';
import type { CutWorldFrameParams } from './cut-world';
import type { StripesFrameParams, StripesSetup } from './stripes';
import {
  buildCutWorldChoreo,
  buildCutWorldSchedule,
  cutPunchZoomAt,
  poolItemAtTime,
  sampleCutWorldChoreo,
  shotIndexAtTime,
  type CutWorldChoreoEvent,
  type CutWorldSchedule,
} from '@/lib/aesthetics/cut-schedule';
import { cssBackgroundToDataUrl as cssBackgroundToDataUrlImpl } from '@/lib/renderer/vendor/three/cssBackgroundTexture';
import {
  creditText,
  resolveTikTokFrameStyle,
  showCreditAt,
  tiktokMetrics,
} from './overlays/layouts/tiktok-shared';

/**
 * Discriminated per-frame world inputs — one per renderBackground() branch
 * (VisualizerComposition.tsx:1162–1485):
 *   'scene-video'       → video (scene mp4; boomerang n/a)
 *   'background-video'  → video (user/theme bg video; boomerang in loop mode)
 *   'scene-pack'        → depth gallery (theme's multi-layer pack)
 *   'scene-images'      → CUT WORLD (lib/renderer/cut-world.ts — beat-driven
 *                         hard cuts through the sceneImages/sceneVideos pool)
 *   'single-image'      → shader scenes (1.2a)
 *   'none'              → single-image with no source (black)
 */
export type WorldArgs =
  | {
      kind: 'single-image';
      frame: number;
      source: WorldBackgroundSource;
      scene: WorldSceneKind;
      /** WebGL context alpha — ColourGradeScene passes false, everything else
       * uses the R3F default (true). Must be known before renderer creation. */
      alpha: boolean;
      params: WorldFrameParams;
    }
  | { kind: 'depth-gallery'; frame: number; assets: DepthGalleryAssets }
  | {
      kind: 'video';
      frame: number;
      video: VideoBackgroundSource;
      width: number;
      height: number;
      fps: number;
    }
  | {
      kind: 'cut-world';
      frame: number;
      /** Session-static schedule (pool items + cut points + shot order). */
      schedule: CutWorldSchedule;
      params: CutWorldFrameParams;
    }
  | {
      /** Procedural crayon stripes (Sobriety Cards) — no source texture. */
      kind: 'stripes';
      frame: number;
      setup: StripesSetup;
      params: StripesFrameParams;
    };

export function buildWorldArgs(ctx: FrameContext, frame: number): WorldArgs {
  const branch = ctx.backgroundBranch;
  const p = ctx.props;

  // ── Phase 1.2b branches — still DESCOPED: depth gallery (scene-pack) and
  // video backgrounds (the partial ports remain on disk at
  // lib/renderer/depth-gallery.ts and lib/renderer/video-background.ts but
  // are intentionally not wired here). The scene-images branch is now the
  // CUT WORLD (below), not the depth gallery. ─────────────────────────────
  if (branch !== 'single-image' && branch !== 'none' && branch !== 'scene-images') {
    throw new Error(
      `buildWorldArgs: background branch '${branch}' is descoped (Phase 1.2b: depth gallery / video backgrounds deferred)`,
    );
  }

  // ── Cut world (scene-images): the Aesthetics image/video pool renderer ──
  const cw = ctx.cutWorld;
  if (branch === 'scene-images' && cw && cw.schedule.items.length > 0) {
    const tSec = frame / ctx.fps;
    const a = ctx.frameArgs(frame);
    // Focal zone: portrait keeps the TikTok middle-band proportions
    // (420–1320 of 1920); landscape fills the frame (no backdrop strip).
    const zoneTopPx = ctx.isPortrait ? Math.round((ctx.height * 420) / 1920) : 0;
    const zoneBottomPx = ctx.isPortrait ? Math.round((ctx.height * 1320) / 1920) : ctx.height;
    const motionEffect =
      ctx.activeMotionEffect === 'colour-grade' ? null : ctx.activeMotionEffect;
    const punchZoom = cutPunchZoomAt(tSec, cw.schedule.cutPointsSec, {
      cutIntensity: cw.cutIntensity,
      intensityCurve: p.intensityCurve,
      windowSec: ctx.cameraDurationInFrames / ctx.fps,
      seed: cw.schedule.seed,
      dropCuts: cw.schedule.dropCuts,
    });
    return {
      kind: 'cut-world',
      frame,
      schedule: cw.schedule,
      params: {
        frame,
        fps: ctx.fps,
        width: ctx.width,
        height: ctx.height,
        durationInFrames: ctx.cameraDurationInFrames,
        cameraMotion: ctx.activeCameraMotion ?? 'static',
        cameraMotionIntensity: p.cameraMotionIntensity ?? 0.5,
        waveEnergy: BACKGROUND_WAVE_CONSTANT * (p.waveEnergyMultiplier ?? 1),
        audioBeats: p.audioBeats ?? [],
        motionEffect,
        motionEffectScale: p.motionEffectScale ?? 1,
        motionEffectGrayscale: p.motionEffectGrayscale ?? false,
        motionWaveEnergy: a.motionWaveEnergy,
        motionTimeScale: p.motionTimeScale ?? 1,
        pulseBoost: p.pulseBoost ?? false,
        zoneTopPx,
        zoneBottomPx,
        choreo: sampleCutWorldChoreo(cw.choreoEvents, tSec),
        cutPunchZoom: punchZoom,
        gradeIntensity: p.colourGradeIntensity ?? 0.5,
        brandBackground: ctx.gradeBrandBackground,
        brandAccent: ctx.gradeBrandAccent,
        brandText: ctx.gradeBrandText,
        gradeLift: ctx.gradePreset.lift,
        gradeGamma: ctx.gradePreset.gamma,
        gradeGain: ctx.gradePreset.gain,
        gradeSaturation: ctx.gradePreset.saturation,
        gradeContrast: ctx.gradePreset.contrast,
        gradeGrain: ctx.gradePreset.grain,
        backgroundBlur: ctx.backgroundBlur,
      },
    };
  }
  // Defensive: scene-images without a resolvable cut-world plan degrades to
  // the single-image/none path below (theme colour / flat background).

  const sub = ctx.backgroundSubBranch;

  // ── TikTok layout: the global background is skipped entirely
  // (VisualizerComposition.tsx:1600); the layout's own full-frame
  // TikTokWorldScene IS the world (its texture = artwork, or a colour
  // texture derived from the frame colour, TikTokLayout.tsx:194–199).
  if (ctx.isTikTokLayout && branch === 'single-image') {
    const style = resolveTikTokFrameStyle(
      ctx.theme,
      p.visualStyle?.tiktokFrameColor,
      p.visualStyle?.tiktokFrameTextColor,
    );
    // TikTok world artwork priority: explicit cover image → background image
    // (imageUrl / custom-theme background) → generated colour plate from the
    // frame style. Without this fallback, portrait videos with a background
    // image but no cover art render as a flat frame-colour box.
    const artworkUrl = ctx.proxiedCoverImageUrl ?? ctx.proxiedImageUrl ?? null;
    const colourTexture = artworkUrl
      ? null
      : cssBackgroundToDataUrl(style.solidColor, ctx.width, ctx.height, {
          accentColor: ctx.theme.accentColor,
        });
    const url = artworkUrl ?? colourTexture;
    const waveEnergyMultiplier = p.waveEnergyMultiplier ?? 1;
    const motionEffect =
      ctx.activeMotionEffect === 'colour-grade' ? null : ctx.activeMotionEffect;
    // Zones are canonical 1080×1920 px — scale to the actual frame height or
    // reduced-resolution previews collapse the middle artwork zone.
    const zones = tiktokMetrics(ctx.height);
    return {
      kind: 'single-image',
      frame,
      source: url ? { kind: 'image', url } : { kind: 'none' },
      scene: 'tiktok-world',
      alpha: false,
      params: {
        frame,
        fps: ctx.fps,
        width: ctx.width,
        height: ctx.height,
        durationInFrames: ctx.cameraDurationInFrames,
        scene: 'tiktok-world',
        cameraMotion: ctx.activeCameraMotion ?? 'static',
        cameraMotionIntensity: p.cameraMotionIntensity ?? 0.5,
        waveEnergy: BACKGROUND_WAVE_CONSTANT * waveEnergyMultiplier,
        audioBeats: p.audioBeats ?? [],
        motionEffect,
        motionEffectScale: p.motionEffectScale ?? 1,
        motionEffectGrayscale: p.motionEffectGrayscale ?? false,
        motionWaveEnergy: ctx.frameArgs(frame).motionWaveEnergy,
        motionTimeScale: p.motionTimeScale ?? 1,
        pulseBoost: p.pulseBoost ?? false,
        solidColor: style.solidRgb,
        zoneTopPx: zones.topZone,
        zoneBottomPx: zones.bottomZoneStart,
        showCredit: showCreditAt(
          creditText(p.mainText ?? '', p.subText ?? ''),
          frame,
          ctx.fps,
          ctx.durationInFrames,
        ),
        gradeIntensity: p.colourGradeIntensity ?? 0.5,
        brandBackground: ctx.gradeBrandBackground,
        brandAccent: ctx.gradeBrandAccent,
        brandText: ctx.gradeBrandText,
        gradeLift: ctx.gradePreset.lift,
        gradeGamma: ctx.gradePreset.gamma,
        gradeGain: ctx.gradePreset.gain,
        gradeSaturation: ctx.gradePreset.saturation,
        gradeContrast: ctx.gradePreset.contrast,
        gradeGrain: ctx.gradePreset.grain,
        backgroundBlur: ctx.backgroundBlur,
      },
    };
  }
  const scene: WorldSceneKind =
    sub === 'motion-effect'
      ? (ctx.activeMotionEffect as WorldSceneKind)
      : sub === 'grade-atmosphere' || sub === 'default-grade' || sub === 'flat'
        ? 'grade'
        : sub === 'wave'
          ? 'wave'
          : 'cover';

  const source: WorldBackgroundSource =
    branch === 'none' || !ctx.shaderBgUrl
      ? { kind: 'none' }
      : { kind: 'image', url: ctx.shaderBgUrl };

  return {
    kind: 'single-image',
    frame,
    source,
    scene,
    alpha: scene !== 'grade',
    params: buildSingleImageParams(ctx, frame, scene, p.colourGradeIntensity ?? 0.5),
  };
}

/** Single-image WorldFrameParams for a frame (the 1.2a scenes). */
function buildSingleImageParams(
  ctx: FrameContext,
  frame: number,
  scene: WorldSceneKind,
  gradeIntensity: number,
): WorldFrameParams {
  const p = ctx.props;
  const a = ctx.frameArgs(frame);
  const waveEnergyMultiplier = p.waveEnergyMultiplier ?? 1;
  return {
    frame,
    fps: ctx.fps,
    width: ctx.width,
    height: ctx.height,
    durationInFrames: ctx.cameraDurationInFrames,
    scene,
    cameraMotion: ctx.activeCameraMotion ?? 'static',
    cameraMotionIntensity: p.cameraMotionIntensity ?? 0.5,
    // 5b passes waveEnergy = BACKGROUND_WAVE_CONSTANT × multiplier and no
    // audioBeats; 5c (cover) passes no waveEnergy at all.
    waveEnergy: scene === 'wave' ? BACKGROUND_WAVE_CONSTANT * waveEnergyMultiplier : 0,
    // Only the 5a scenes receive the beat grid (:1281/:1345); the
    // continuous pulse mode ignores it, rgb-glitch uses it for bursts.
    audioBeats: scene === 'rgb-glitch' ? (p.audioBeats ?? []) : [],
    motionEffectScale: p.motionEffectScale ?? 1,
    motionEffectGrayscale: p.motionEffectGrayscale ?? false,
    motionWaveEnergy: a.motionWaveEnergy,
    gradeIntensity,
    brandBackground: ctx.gradeBrandBackground,
    brandAccent: ctx.gradeBrandAccent,
    brandText: ctx.gradeBrandText,
    gradeLift: ctx.gradePreset.lift,
    gradeGamma: ctx.gradePreset.gamma,
    gradeGain: ctx.gradePreset.gain,
    gradeSaturation: ctx.gradePreset.saturation,
    gradeContrast: ctx.gradePreset.contrast,
    gradeGrain: ctx.gradePreset.grain,
    backgroundBlur: ctx.backgroundBlur,
  };
}
