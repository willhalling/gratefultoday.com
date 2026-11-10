/**
 * VisualizerCompositionProps — the composition prop contract shared by the
 * canvas engine (lib/renderer) and its callers. Extracted from the former
 * remotion/VisualizerComposition.tsx ahead of the Remotion removal.
 */

import type { VisualizerPreset } from '@/constants/visualizers';
import type { ThemeId, ThemeConfig } from '@/constants/themes';
import type { SocialLinksData } from '@/types/social';
import type { WordTiming, SubtitleConfig } from '@/lib/renderer/types';
import type { LyricPhrase } from '@/lib/renderer/vendor/slots/lyricPhrase';
import type { LayoutId } from '@/constants/layouts';
import type { MusicTimeline } from '@/lib/audio-analysis';
import type {
  CameraMotion,
  CameraMotionIntensity,
} from '@/lib/renderer/vendor/three/camera/cameraMotion';

export interface VisualizerCompositionProps {
  imageUrl?: string | null;
  audioUrl?: string;
  /** Optional compressed preview audio (e.g. MP3). When provided, the client
   *  preview decodes this instead of the original file, which is much faster
   *  for large WAVs. Export still uses `audioUrl`. */
  previewAudioUrl?: string | null;
  /** Output frame rate — only 30 is honoured; anything else falls back to 60
   * (see calculateMetadata in Root.tsx). Passed out-of-band by render jobs. */
  fps?: number;
  /** Dev-only: when true, render the ParityFrameDump probe publishing the
   * composition's derived values for scripts/parity/frame-context-parity.ts.
   * Never set by production callers. */
  __parityDump?: boolean;
  /** Dev-only: when true, render ONLY the WebGL background stack
   * (renderBackground()) — no audio/layout/scrims/fx/watermark — so
   * scripts/parity/world-parity.mts can pixel-diff the world layer in
   * isolation. Never set by production callers. */
  __backgroundOnly?: boolean;
  /** When true, the client preview proxies cross-origin audio through /api/proxy-audio so
   * Remotion's useAudioData can decode it without CORS errors. */
  proxyAudioForAnalysis?: boolean;
  /** When true, the client preview proxies external CDN images through /api/proxy-image
   * so Remotion/Three.js can load them without CORS errors. */
  proxyImagesForPreview?: boolean;
  preset?: VisualizerPreset;
  mainText?: string;
  subText?: string;
  /**
   * Social hook line for the TikTok layout ("pov: …" style text in the top
   * solid zone). Falls back to `visualStyle.hook` when not passed directly.
   */
  hook?: string;
  theme?: ThemeId;
  coverImageUrl?: string | null;
  blurredBackgroundUrl?: string | null;
  socialLinks?: SocialLinksData;
  /**
   * Whether this is podcast/speech content (disables heavy animations)
   */
  isPodcast?: boolean;
  /**
   * When true, use Html5Audio for playback (preview/Player/Studio).
   * When false, use Audio from @remotion/media (for web-renderer exports).
   */
  useHtml5Audio?: boolean;
  duration?: number;
  orientation?: 'landscape' | 'portrait';
  /**
   * Thumbnail mode – reduces 3D quality for better performance
   */
  isThumbnail?: boolean;
  /** Show lyrics instead of the visualizer */
  showLyrics?: boolean;
  /** Word timings from Whisper transcription */
  lyricsWords?: WordTiming[];
  /** AI-grouped lyric phrases — when present, renders animated styles */
  lyricsLines?: LyricPhrase[];
  /** Track BPM — biases lyric style selection based on energy (slow/mid/fast) */
  audioBpm?: number;
  /** Background image for poster/lyrics layout */
  posterBackgroundUrl?: string | null;

  debugMarkers?: {
    fadeDownStartSec: number;
    fadeDownEndSec: number;
    fadeUpStartSec: number;
    fadeUpEndSec: number;
  } | null;
  /** When true, render the "Made with Grateful Today" watermark (free tier users) */
  showWatermark?: boolean;
  /** Artist logo/mark — replaces the artist name when display is 'logo'. */
  artistLogoUrl?: string | null;
  artistLogoScale?: number;
  artistLogoDisplay?: 'logo' | 'name';
  /** When true, fades audio out at the end. Only set for actual sample renders — never in editor preview. */
  fadeAudio?: boolean;
  /** Fade-out duration in seconds when `fadeAudio` is true. Defaults to 1s. */
  fadeOutSec?: number;
  /** Dev-only: overlay showing the current spoken word for sync debugging */
  showDebug?: boolean;
  /** Detected beat timestamps (absolute seconds) from audio analysis */
  audioBeats?: number[];
  /** When true, word reveals in lyrics are snapped to the nearest beat grid tick */
  beatSnapEnabled?: boolean;
  /** Subtitle rendering settings (mode/size/position). */
  subtitle?: SubtitleConfig;
  /** @deprecated Use subtitle.mode */
  subtitleMode?: SubtitleConfig['mode'];
  /** @deprecated Use subtitle.size */
  subtitleSize?: SubtitleConfig['size'];
  /** When theme is 'custom', the fully-built ThemeConfig to use in the renderer. */
  customThemeConfig?: ThemeConfig;
  /** Flat per-video visual settings. When provided, takes precedence over
   *  themeId + customThemeConfig for the resolved theme. */
  visualStyle?: import('@/lib/renderer/types').VisualizerSettings;
  /** Per-video overlay override. When set, replaces the theme's own overlayEffect. */
  overlayEffect?: ThemeConfig['overlayEffect'];
  /** Multiple overlay effects layered together. Takes precedence over overlayEffect. */
  overlayEffects?: ThemeConfig['overlayEffects'];
  /** Layout override — when set, takes precedence over the theme's artworkLayout. */
  artworkLayout?: LayoutId;
  /** Output resolution — '4k' doubles dimensions to 3840×2160 / 2160×3840. Pro only. */
  resolution?: '1080p' | '4k';
  /** Animated film-grain / vinyl texture. Default: true */
  enableFilmGrain?: boolean;
  /**
   * User-uploaded looping video used as a full-screen background.
   * Takes priority over backgroundImageUrl; overridden by sceneVideoUrl.
   */
  backgroundVideoUrl?: string | null;
  /**
   * Pre-baked forward+reversed boomerang version of `backgroundVideoUrl`.
   * Used by the Remotion render path to get a seamless ping-pong loop
   * without the JS-driven seek logic the preview uses.
   */
  backgroundVideoBoomerangUrl?: string | null;
  /**
   * Looping scene video URL — when set, replaces WavyBackgroundLayer with a
   * VideoBackgroundLayer.  Landscape or portrait variant should be passed by the
   * caller based on the active orientation.
   */
  sceneVideoUrl?: string | null;
  /**
   * Background image pool (AI wizard scenes / aesthetics). Drives the
   * cut-world renderer (`scene-images` background branch): one item at a
   * time, hard-cut at beat-driven points, cycled for the full song —
   * see lib/aesthetics/cut-schedule.ts.
   */
  sceneImages?: string[];
  /**
   * Short video clips mixed into the `sceneImages` cut-world pool (~1 in 4
   * items, seeded interleave — see lib/aesthetics/cut-schedule.ts). Rendered
   * as video textures with deterministic per-frame seeking on export.
   */
  sceneVideos?: string[];
  /**
   * Aesthetic editing grammar for the cut world: shot lengths in beats
   * (e.g. [2, 4]) and how strongly high-energy windows shorten them.
   * Defaults to { shotDurationBeats: [2, 4], cutIntensity: 0.5 }.
   */
  aestheticEditing?: {
    shotDurationBeats: number[];
    cutIntensity: number;
    /** Transition palette between shots; absent = hard cuts. */
    transitions?: ('cut' | 'flash' | 'crossfade')[];
  };
  /**
   * Per-scene lyric phrase windows aligned to `sceneImages` by index. Used
   * by the Director Cut preset to time image swaps to the lyric on screen.
   * Optional — legacy songs without word-level lyrics omit this and fall
   * back to round-robin sequencing.
   */
  sceneLyricAnchors?: { startTime: number; endTime: number }[];
  /**
   * Pre-extracted dominant-colour palettes (one per `sceneImages` entry).
   * When provided, `DepthGalleryBackground` renders synchronously — no
   * client-side image decode, no `delayRender` stall in the preview.
   */
  sceneImagePalettes?: ({ background: string; blob1: string; blob2: string } | null)[];
  /** Transition style when cycling sceneImages. Defaults to 'fade'. */
  wizardTransitionStyle?: 'fade' | 'slide' | 'wipe';
  /**
   * How fast the depth gallery camera bounces through scene images.
   * When omitted, auto-detected from `audioBpm`. See DepthGalleryBackground.
   */
  sceneGallerySpeed?: 'slow' | 'medium' | 'fast';
  /**
   * Music timeline (sections / beats / impacts / emotional curve) from the
   * audio analyser. When provided, the depth-gallery camera is choreographed
   * to song energy and emotion. Optional — falls back to constant-velocity
   * cosine sweep when missing.
   */
  musicTimeline?: MusicTimeline | null;
  /** Optional intensity curve from song analysis to drive cut pace. */
  intensityCurve?: number[] | null;
  /**
   * Scales the real-time audio-reactive wave energy for the background.
   * Derived from the pre-analysed song energy: low → 0.4, mid → 1.0, high → 2.0.
   * Defaults to 1.0 (no scaling).
   */
  waveEnergyMultiplier?: number;
  /**
   * Motion effect applied to the single-image background. When 'pulse',
   * 'rgb-glitch', 'rain', 'dream' or 'colour-grade' (and `motionEffectScale`
   * > 0), the background renders through the matching Three.js shader scene
   * instead of the wavy/static image. 'liquid-glass' is legacy and treated
   * as 'none'.
   */
  motionEffect?: 'none' | 'pulse' | 'liquid-glass' | 'rgb-glitch' | 'rain' | 'dream' | 'colour-grade';
  /** Strength of the motion effect (0 disables it). Defaults to 1. */
  motionEffectScale?: number;
  /** Desaturate the background to B&W so colour fringes stand out (rgb-glitch
   *  only). Default false (natural colour). */
  motionEffectGrayscale?: boolean;
  /** Scales the motion-effect animation clock on the TikTok world (1 =
   *  realtime; slowed presets pass the audio playbackRate so the pulse slows
   *  proportionally). Beat-synced logic stays realtime. Default 1. */
  motionTimeScale?: number;
  /** slowedgen-style big pulse on the TikTok world's pulse effect (preset
   *  releases only). Default false. */
  pulseBoost?: boolean;
  /** Shared brand colour grade applied on top of every shader atmosphere
   *  (rain / dream / pulse / rgb-glitch / colour-grade). 0 = bypass,
   *  1 = full grade. Default 0. */
  colourGradeIntensity?: number;
  /** Grade preset id from GRADE_PRESETS (lib/renderer/vendor/three/colourGrade) —
   *  selects the lift/gamma/gain/saturation/contrast/grain shaping. The
   *  brand tint colours always come from the active theme. Default
   *  'original'. */
  colourGradePreset?: string;
  /** Allow the shader motion-effect layer (5a) to render in thumbnail mode.
   *  Used only by the drawer's Atmosphere picker cards, which are live shader
   *  previews by design. Export and normal thumbnails leave this off. */
  allowMotionPreview?: boolean;
  /**
   * Camera-motion layer — a separate system from the background motion
   * effect. When set (≠ 'static'), the single-image background renders under
   * a perspective camera rig (push/pull/drift/float/orbit/breathing) that
   * moves independently of any surface shader effect. Default 'static'.
   */
  cameraMotion?: CameraMotion;
  /** Strength of the camera motion — continuous 0–1. Default 0.5. */
  cameraMotionIntensity?: CameraMotionIntensity;
  /**
   * Optional crop applied to the source audio file. When set, the
   * composition only plays `[start, end]` of the original track. Frame 0 of
   * the composition corresponds to `start` of the file; lyric word timings
   * are expected to already be rebased to `start = 0`.
   */
  audioTrim?: { start: number; end: number } | null;
  /** Optional opening treatment for short-form hook intros. */
  hookOpeningPreset?: 'none' | 'minimal' | 'subtle' | 'impact' | 'aggressive' | 'cinematic' | 'flyby';
  /**
   * Optional held intro card. When set, the composition renders a solid
   * theme-colour card with `text` for `holdSec` seconds at frame 0, then
   * the audio + visualizer begin. The caller must have already grown the
   * composition's total `durationInFrames` to include the hold; this prop
   * only controls the prepended visual + the delay applied to the rest of
   * the composition's children.
   */
  clipHook?: {
    text: string;
    holdSec: number;
    bgColor: string;
    textColor: string;
    textShadow?: string;
    /** Hook text animation style. Defaults to `'pill'`. */
    animation?: 'pill' | 'inkBleed';
    /**
     * Optional pre-rendered spoken intro played on top of the held card.
     * When set, `holdSec` is expected to equal the VO duration so the
     * card stays on screen for the whole spoken intro and the existing
     * music-duck math (keyed on `holdFrames`) automatically stretches.
     */
    voiceoverUrl?: string;
    voiceoverDurationSec?: number;
  } | null;
  /**
   * Whether to show audio-reactive perimeter border bars on the depth gallery.
   * Only relevant when `sceneImages` has multiple entries. Defaults to `true`.
   */
  depthBorderBars?: boolean;
  /**
   * When true, skips artwork/text entry fade-in so everything is visible from frame 0.
   * Use in preview players where the user needs to inspect the output immediately.
   */
  skipEntryAnimation?: boolean;
  /**
   * Full song duration in frames. Pass this when rendering a sample clip so
   * DepthGalleryBackground uses the whole-song timeline rather than the
   * shorter sample composition length (which would speed the gallery up).
   */
  fullDurationInFrames?: number;
  /**
   * Director-as-a-Service mode. Disables the dark scrim, theme overlay
   * gradient and lyrics-readability scrim so the FAL-generated background
   * carries the full luminance. Director clips are designed around the
   * backdrop's own contrast so the legacy darken layers wash them out.
   */
  directorMode?: boolean;
  /**
   * Director template selector. `'cinematic'` (default) renders the
   * existing depth-gallery + lyric-hook layout. `'now-playing'` swaps the
   * whole composition for an Apple-Music-style player card
   * (`NowPlayingComposition`) — square depth artwork on top, wavy FAL
   * background, track title, animated progress bar, transport buttons,
   * volume bar. Only consulted when `directorMode === true`.
   */
  template?: 'cinematic' | 'now-playing';
  /**
   * Optional override for the now-playing square artwork. When passed by an
   * API-service caller, this replaces the gallery images for the 1:1 tile
   * (the cinematic background images are still used for the wavy backdrop
   * unless `nowPlayingBgUrl` is also supplied).
   */
  nowPlayingArtworkUrl?: string | null;
  /**
   * Optional FAL image for the wavy background layer of the now-playing
   * template. When omitted, falls back to the first cinematic gallery
   * image so the look stays cohesive.
   */
  nowPlayingBgUrl?: string | null;
}
