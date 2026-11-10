import type { VisualizerPreset } from '@/constants/visualizers';
import type { ReleaseVariantId } from '@/lib/renderer/types';
import type { ThemeFontKey } from './fonts';
import type { VisualConcept } from './visual-concepts';
import type { OverlayEffect } from './overlays';

/** The stable creative brief derived from a song's existing visualDirection. */
export interface CreativeBrief {
  /** Song-level archetype from visualDirection. */
  archetype: string;
  /** Direction profile ID from visualDirection (e.g. wide-cinematic). */
  directionProfileId: string;
  /** Broad theme category from visualDirection (e.g. cinematic, organic). */
  theme: string;
  /** One-line creative thesis. */
  themeStatement: string;
  /** Long-form narrative imagery. */
  story: string;
  /** Color/lighting guidance from storyBible. */
  masterColorGrade: string;
  /** Secondary palette hint. */
  paletteHint?: string;
  /** Recurring visual motif, if any. */
  recurringProp?: string;
  /** Time-of-day arc, if any. */
  timeOfDayArc?: string;
  /** Suggested location, if any. */
  location?: string;
  /** Protagonist description, if any. */
  protagonist?: string;
}

export interface ThemeBackground {
  type: 'solid' | 'gradient';
  value: string; // CSS color or gradient
}

export interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  background: ThemeBackground;
  accentColor: string;
  textColor: string;
  textShadow: string;
  font: ThemeFontKey;
  placeholders: {
    mainText: string;
    subText: string;
  };
  preferredVisualizer: VisualizerPreset;
  // Optional styling overrides
  visualizerOpacity?: number;
  overlayGradient?: string;
  useBlurredBackground?: boolean;
  /** Semi-transparent pill background applied to lyrics words when a poster background image is active.
   *  Defaults to rgba(0,0,0,0.6) if not set. Use a light value for themes with dark text. */
  lyricsBackdrop?: string;
  /**
   * Custom-theme only: mirrors CustomThemeConfig.backgroundType so the renderer
   * can distinguish scene packs from single-image backgrounds without inspecting
   * the URL list.
   */
  backgroundType?: CustomThemeConfig['backgroundType'];
  /**
   * Custom-theme only: a Firebase Storage URL used as the full-bleed background image.
   * Applied as the composition's `imageUrl` when theme === 'custom'.
   */
  backgroundImageUrl?: string;
  /**
   * Custom-theme only: a Firebase Storage URL used as a looping full-bleed background video.
   * Applied as the composition's `backgroundVideoUrl` when theme === 'custom'.
   */
  backgroundVideoUrl?: string;
  /**
   * Scene Pack: AI-generated depth layers of ONE coherent world, ordered
   * back-to-front (sky, background, midground, foreground). When present the
   * composition renders them through the Three.js scene-depth gallery instead
   * of the single background image.
   */
  scenePackImages?: string[];
  /**
   * True when the theme's native background is light (white/cream/pastel).
   * When a user adds a full-bleed background image the renderer will automatically
   * apply a dark scrim + switch text to white so it stays legible.
   */
  lightBackground?: boolean;
  /** Lyric animation style. When set, the renderer uses it instead of auto-classifying. */
  lyricStyle?: import('@/lib/renderer/types').VisualizerSettings['lyricStyle'];
  /** Full-screen overlay effect (film grain, sparkles, light leaks, etc.). */
  overlayEffect?: OverlayEffect;
  /** Multiple overlay effects layered together. Takes precedence over overlayEffect. */
  overlayEffects?: OverlayEffect[];
  /** Background motion/wave intensity. Supports continuous 0–1 numbers. */
  motionIntensity?: 'off' | 'subtle' | 'balanced' | 'intense' | number;
  /** Recommended camera motion for the background rig (independent layer). */
  cameraMotion?: import('@/lib/renderer/vendor/three/camera/cameraMotion').CameraMotion;
  /** Recommended background motion effect (surface shader). */
  motionEffect?: 'none' | 'pulse' | 'liquid-glass' | 'rgb-glitch' | 'rain' | 'dream' | 'colour-grade';
  /** Scene/image transition style. */
  transitionStyle?: 'fade' | 'slide' | 'wipe';
  /** Subtle full-screen texture overlay that sits on top of the background colour/gradient. */
  backgroundTexture?: 'none' | 'paper' | 'halftone' | 'mesh' | 'dust' | 'film';
  /** How the cover artwork is composed in the frame. */
  artworkLayout?: import('./layouts').LayoutId;
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'hip-hop',
    name: 'Hip Hop',
    description: 'Bold black background with gold accents for rap and hip hop artists',
    category: 'Music, Hip Hop, Rap',
    background: {
      type: 'gradient',
      value: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%)',
    },
    accentColor: '#FFD700',
    textColor: '#FFFFFF',
    textShadow:
      '0 4px 20px rgba(255,215,0,0.8), 0 0 60px rgba(255,215,0,0.4), 0 2px 4px rgba(0,0,0,0.9)',
    font: 'energetic',
    placeholders: {
      mainText: 'Track Title',
      subText: 'Artist Name',
    },
    preferredVisualizer: 'bars',
    visualizerOpacity: 1,
    overlayGradient: 'radial-gradient(circle, transparent 30%, rgba(0,0,0,0.5) 100%)',
  },
  {
    id: 'blurred-center',
    name: 'Blurred Backdrop',
    description: 'Centered artwork with blurred background for stunning visual impact',
    category: 'Music, Art, Photography',
    background: {
      type: 'solid',
      value: '#1a1a1a',
    },
    accentColor: '#4ECDC4',
    textColor: '#FFFFFF',
    textShadow: '0 4px 16px rgba(0,0,0,0.8), 0 0 30px rgba(78,205,196,0.3)',
    font: 'minimalist',
    placeholders: {
      mainText: 'Track Title',
      subText: 'Artist Name',
    },
    preferredVisualizer: 'wave',
    visualizerOpacity: 0.9,
    overlayGradient: 'none',
    useBlurredBackground: true,
  },
  {
    id: 'minimalist',
    name: 'Clean Minimalist',
    description: 'Simple centered design with monochrome aesthetic',
    category: 'Business, Tech, Educational',
    background: {
      type: 'solid',
      value: '#FFFFFF',
    },
    accentColor: '#000000',
    textColor: '#1a1a1a',
    textShadow: 'none',
    font: 'minimalist',
    placeholders: {
      mainText: 'Episode Title',
      subText: 'Your Podcast Name',
    },
    preferredVisualizer: 'wave',
    visualizerOpacity: 0.8,
    overlayGradient: 'none',
    lyricsBackdrop: 'rgba(255,255,255,0.82)',
    lightBackground: true,
  },
  {
    id: 'energetic',
    name: 'Bold & Energetic',
    description: 'Vibrant colors with dynamic movement',
    category: 'Comedy, Pop Culture, Entertainment',
    background: {
      type: 'gradient',
      value: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    },
    accentColor: '#FFD700',
    textColor: '#FFFFFF',
    textShadow: '0 4px 16px rgba(0,0,0,0.8), 0 0 40px rgba(255,215,0,0.5)',
    font: 'energetic',
    placeholders: {
      mainText: 'Hype Track',
      subText: 'Artist Name',
    },
    preferredVisualizer: 'bars',
    visualizerOpacity: 1,
    overlayGradient: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.3) 100%)',
  },
  {
    id: 'cinematic',
    name: 'Cinematic Storytelling',
    description: 'Darker background with subtle glows and warm tones',
    category: 'True Crime, Fiction, Interviews',
    background: {
      type: 'gradient',
      value: 'linear-gradient(135deg, #1a0a0a 0%, #2d1b1b 50%, #1a0a0a 100%)',
    },
    accentColor: '#d4a574',
    textColor: '#f5e6d3',
    textShadow: '0 4px 20px rgba(212,165,116,0.6), 0 0 60px rgba(212,165,116,0.3)',
    font: 'cinematic',
    placeholders: {
      mainText: 'True Crime Episode',
      subText: 'Podcast Series',
    },
    preferredVisualizer: 'radial-bars',
    visualizerOpacity: 0.7,
    overlayGradient: 'radial-gradient(circle, transparent 20%, rgba(26,10,10,0.8) 100%)',
  },
  {
    id: 'retro-synthwave',
    name: 'Retro Synthwave',
    description: 'Neon grids, pink/purple/cyan gradients with 80s vibes',
    category: 'Music Podcasts, Nostalgia, Pop Culture',
    background: {
      type: 'gradient',
      value: 'linear-gradient(135deg, #ff00ff 0%, #00ffff 50%, #ff1493 100%)',
    },
    accentColor: '#ff00ff',
    textColor: '#00ffff',
    textShadow:
      '0 0 20px rgba(0,255,255,0.8), 0 0 40px rgba(255,0,255,0.6), 0 4px 8px rgba(0,0,0,0.9)',
    font: 'retro',
    placeholders: {
      mainText: 'NEON NIGHTS (Remix)',
      subText: 'Synthwave Artist',
    },
    preferredVisualizer: 'bars',
    visualizerOpacity: 1,
    overlayGradient: 'radial-gradient(ellipse at bottom, transparent 0%, rgba(0,0,0,0.4) 80%)',
  },
  {
    id: 'corporate',
    name: 'Corporate Professional',
    description: 'Subtle animations with navy/gray palettes',
    category: 'B2B, Finance, Leadership, Business',
    background: {
      type: 'gradient',
      value: 'linear-gradient(135deg, #1e3a5f 0%, #2c4a6e 50%, #1a2942 100%)',
    },
    accentColor: '#5b9bd5',
    textColor: '#e8eef5',
    textShadow: '0 2px 12px rgba(91,155,213,0.4)',
    font: 'corporate',
    placeholders: {
      mainText: 'Business Podcast',
      subText: 'Show Name',
    },
    preferredVisualizer: 'bars',
    visualizerOpacity: 0.6,
    overlayGradient: 'linear-gradient(to bottom, transparent 0%, rgba(26,41,66,0.3) 100%)',
  },
  {
    id: 'organic',
    name: 'Organic Natural',
    description: 'Earthy tones with flowing liquid-like animations',
    category: 'Wellness, Meditation, Spirituality, Nature',
    background: {
      type: 'gradient',
      value: 'linear-gradient(135deg, #8b7355 0%, #a89077 50%, #6b5744 100%)',
    },
    accentColor: '#ffffff',
    textColor: '#f5e6d3',
    textShadow: '0 2px 8px rgba(107,87,68,0.6)',
    font: 'organic',
    placeholders: {
      mainText: 'Meditation Session',
      subText: 'Guided Audio',
    },
    preferredVisualizer: 'hills',
    visualizerOpacity: 0.7,
    overlayGradient: 'radial-gradient(circle at center, transparent 30%, rgba(107,87,68,0.3) 100%)',
  },
  {
    id: 'glitch',
    name: 'Glitch Digital',
    description: 'RGB split effects with sharp angular visualizations',
    category: 'Gaming, Tech, Cybersecurity, Futurism',
    background: {
      type: 'gradient',
      value: 'linear-gradient(135deg, #0a0a0a 0%, #1a001a 50%, #000a1a 100%)',
    },
    accentColor: '#00ff00',
    textColor: '#00ffff',
    textShadow: '2px 0 #ff0000, -2px 0 #00ff00, 0 2px #0000ff, 0 4px 8px rgba(0,255,255,0.8)',
    font: 'glitch',
    placeholders: {
      mainText: 'Glitch Sequence',
      subText: 'Electronic Artist',
    },
    preferredVisualizer: 'bars',
    visualizerOpacity: 1,
    overlayGradient:
      'linear-gradient(0deg, rgba(0,255,0,0.1) 0%, transparent 10%, rgba(255,0,0,0.05) 20%, transparent 30%, rgba(0,0,255,0.1) 40%, transparent 50%)',
  },
  {
    id: 'hand-drawn',
    name: 'Hand-drawn Sketchy',
    description: 'Illustrated elements with warm, playful aesthetic',
    category: 'Comedy, Storytelling, Indie Creators',
    background: {
      type: 'solid',
      value: '#fff8e7',
    },
    accentColor: '#ff6b6b',
    textColor: '#2d3436',
    textShadow: '2px 2px 0 rgba(255,107,107,0.3)',
    font: 'sketchy',
    placeholders: {
      mainText: 'Story Time',
      subText: 'Podcast with Host',
    },
    preferredVisualizer: 'wave',
    visualizerOpacity: 0.8,
    overlayGradient: 'none',
    lyricsBackdrop: 'rgba(255,255,255,0.75)',
    lightBackground: true,
  },
  {
    id: 'data-viz',
    name: 'Data Visualization',
    description: 'Grid backgrounds with spectrum analyzer style',
    category: 'News, Research, Data Journalism',
    background: {
      type: 'gradient',
      value: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    },
    accentColor: '#4fc3f7',
    textColor: '#e0f7fa',
    textShadow: '0 2px 8px rgba(79,195,247,0.5)',
    font: 'data',
    placeholders: {
      mainText: 'News Briefing',
      subText: 'Daily Podcast',
    },
    preferredVisualizer: 'bars',
    visualizerOpacity: 0.9,
    overlayGradient: 'linear-gradient(to top, rgba(15,32,39,0.6) 0%, transparent 100%)',
  },
  {
    id: 'lofi',
    name: 'Lofi Chill',
    description: 'Muted pastels with soft, relaxed animations',
    category: 'Study Podcasts, ASMR, Chill Content',
    background: {
      type: 'gradient',
      value: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 50%, #ffeaa7 100%)',
    },
    accentColor: '#fd79a8',
    textColor: '#2d3436',
    textShadow: 'none',
    font: 'lofi',
    placeholders: {
      mainText: 'chill beats',
      subText: 'lofi producer',
    },
    preferredVisualizer: 'hills',
    visualizerOpacity: 0.6,
    overlayGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.3) 0%, transparent 60%)',
    lyricsBackdrop: 'rgba(255,255,255,0.72)',
    lightBackground: true,
  },
  {
    id: 'wavecanvas',
    name: 'WaveCanvas',
    description: 'Official WaveCanvas dark theme with purple accents and Space Grotesk',
    category: 'Music, Electronic, Creator',
    background: {
      type: 'gradient',
      value: 'linear-gradient(135deg, #0f0a1a 0%, #1a0f2e 50%, #0d0820 100%)',
    },
    accentColor: '#a855f7',
    textColor: '#ffffff',
    textShadow:
      '0 4px 20px rgba(168,85,247,0.7), 0 0 60px rgba(168,85,247,0.3), 0 2px 4px rgba(0,0,0,0.9)',
    font: 'modern',
    placeholders: {
      mainText: 'Track Title',
      subText: 'Artist Name',
    },
    preferredVisualizer: 'wave',
    visualizerOpacity: 0.9,
    overlayGradient: 'radial-gradient(circle at center, transparent 40%, rgba(15,10,26,0.6) 100%)',
  },
  // ── Custom theme sentinel ─────────────────────────────────────────────────
  // Neutral defaults shown before the user has saved a custom config.
  {
    id: 'custom',
    name: 'Custom',
    description: 'Your own colours, font, and background',
    category: 'Custom',
    background: { type: 'solid', value: '#18181b' },
    accentColor: '#A855F7',
    textColor: '#FFFFFF',
    textShadow: '0 2px 12px rgba(0,0,0,0.7)',
    font: 'energetic' as const,
    placeholders: { mainText: 'Track Title', subText: 'Artist Name' },
    preferredVisualizer: 'bars' as const,
    visualizerOpacity: 1,
  },
];

export type ThemeId = (typeof THEMES)[number]['id'];

/** Editable options a user controls when building their custom theme. */
export interface CustomThemeConfig {
  accentColor: string;
  textColor: string;
  backgroundType: 'solid' | 'gradient' | 'image' | 'video' | 'scene-pack' | 'artwork';
  backgroundColor: string;
  backgroundColorEnd?: string;
  backgroundImageUrl?: string;
  backgroundVideoUrl?: string;
  font: import('./fonts').ThemeFontKey;
  preferredVisualizer: import('@/constants/visualizers').VisualizerPreset;
  /** Blurred-backdrop layout — maps to ThemeConfig.useBlurredBackground. */
  useBlurredBackground?: boolean;
  /** Amount of blur applied to the background image (0 = sharp, 1 = heavy). */
  backgroundBlur?: number;
  /** Lyric animation style owned by the theme; 'auto' = per-line classifier. */
  lyricStyle?: import('@/lib/renderer/types').VisualizerSettings['lyricStyle'];
  /** Video overlay effect owned by the theme (constants/overlays.ts keys). */
  overlayEffect?: OverlayEffect;
  /** Multiple overlay effects that can be layered together. Takes precedence over overlayEffect. */
  overlayEffects?: OverlayEffect[];
  /** Wave/motion energy owned by the theme — maps to video waveIntensity.
   *  Supports continuous 0–1 numbers for finer control. */
  motionIntensity?: 'off' | 'subtle' | 'balanced' | 'intense' | number;
  /** Camera motion recommended by the theme — maps to video cameraMotion. */
  cameraMotion?: import('@/lib/renderer/vendor/three/camera/cameraMotion').CameraMotion;
  /**
   * Camera motion intensity owned by the theme — continuous 0–1, maps to video
   * cameraMotionIntensity. Legacy themes may hold 'subtle' | 'balanced' |
   * 'intense'; normalise with `normalizeCameraIntensity` when reading.
   */
  cameraMotionIntensity?: import('@/lib/renderer/vendor/three/camera/cameraMotion').CameraMotionIntensity
    | import('@/lib/renderer/vendor/three/camera/cameraMotion').LegacyCameraMotionIntensity;
  /** Background motion effect recommended by the theme — maps to video motionEffect. */
  motionEffect?: 'none' | 'pulse' | 'liquid-glass' | 'rgb-glitch' | 'rain' | 'dream' | 'colour-grade';
  /** Background motion effect intensity — maps to video motionEffectIntensity
      ('off' is expressed via motionEffect: 'none'). Supports continuous 0–1. */
  motionEffectIntensity?: 'subtle' | 'balanced' | 'intense' | number;
  /** Desaturate the background to black & white (Colour Grade) — maps to video
      motionEffectGrayscale. */
  motionEffectGrayscale?: boolean;
  /** Scene transition style owned by the theme. */
  transitionStyle?: 'fade' | 'slide' | 'wipe';
  /** Subtle full-screen texture overlay that sits on top of the background colour/gradient. */
  backgroundTexture?: 'none' | 'paper' | 'halftone' | 'mesh' | 'dust' | 'film';
  /** How the cover artwork is composed in the frame. */
  artworkLayout?: import('./layouts').LayoutId;
  /** True when the effective background is light. Drives renderer shadows/scrims. */
  lightBackground?: boolean;
  /** Contrast-safe shadow/glow applied to text. Generated automatically from textColor. */
  textShadow?: string;
  /** Semi-transparent backdrop behind lyrics/header text on busy backgrounds. */
  lyricsBackdrop?: string;
  /** Default overlay text saved with the theme. */
  defaultMainText?: string;
  /** Default sub text saved with the theme. */
  defaultSubText?: string;
  /** Default social links saved with the theme. */
  defaultSocialLinks?: {
    heading: string;
    links: Array<{ platform: string; url?: string }>;
  };
  /** Default cover/artwork image URL saved with the theme. */
  defaultArtworkUrl?: string;
  /**
   * AI-generated per-release-variant backgrounds. When the theme is applied to a
   * video, these are written into each variant's override so every short-form
   * cut can have its own backdrop while sharing the same colours/font.
   */
  variantBackgrounds?: Partial<
    Record<ReleaseVariantId, { backgroundImageUrl?: string; backgroundVideoUrl?: string }>
  >;
  /**
   * Scene Pack: AI-generated depth layers of ONE coherent world, ordered
   * back-to-front (sky, background, midground, foreground). Rendered through
   * the Three.js scene-depth gallery instead of the single background image.
   */
  scenePackImages?: string[];
}

/** Returns true when a theme config renders as a scene/theme pack instead of a single living image. */
export function isSceneThemeConfig(config: CustomThemeConfig): boolean {
  return (
    config.backgroundType === 'scene-pack' ||
    config.backgroundType === 'video' ||
    (config.scenePackImages?.length ?? 0) > 0
  );
}

/** A saved theme inside the user's theme library. */
export interface ThemeLibraryItem {
  id: string;
  name: string;
  description?: string;
  config: CustomThemeConfig;
  isDefault: boolean;
  /** User-marked favourite — a strong quality signal for the learning loop. */
  favorite?: boolean;
  /** How many times the theme has been applied to a video. */
  timesUsed?: number;
  /** How the theme was created (AI generation vs manual editor). */
  origin?: 'ai' | 'manual';
  /** Set when the theme was forked from a community theme (themes/{id}). */
  sourceThemeId?: string;
  /** Creative metadata captured at generation time — drives community
   *  categorisation (genres/moods/energy) and adaptive regeneration later. */
  aiContext?: ThemeVersionAIContext;
  /** Set when this library theme is shared to the community library. */
  communityThemeId?: string;
  /** 'shared' = visible in community; 'withdrawn' = previously shared then removed. */
  communityStatus?: 'shared' | 'withdrawn';
  createdAt: number; // ms epoch (Firestore Timestamp -> toMillis on client)
  updatedAt: number; // ms epoch
}

/**
 * A creative execution generated from a project's CreativeBrief. Executions are
 * generated once per project and consumed one at a time by Generate Theme.
 */
export interface ThemeExecution extends VisualConcept {
  /** Why this execution was suggested: brief / lyrics / emotion / genre / audio / artwork / rotation. */
  reason: string;
  /** The specific brief element, keyword, emotion or genre that matched. */
  matched?: string;
  /** Theme-family bias used for this execution (e.g. cinematic, neon). */
  familyBias?: string;
  /** Whether this execution has already been used to generate a theme. */
  used: boolean;
  createdAt: number; // ms epoch
}

/**
 * @deprecated Use ThemeExecution instead.
 */
export type DiscoveredConcept = ThemeExecution;

/** The signals the AI generator used — kept so a theme can be regenerated/improved later. */
export interface ThemeVersionAIContext {
  mood?: string;
  genre?: string;
  energy?: string;
  lyricThemes?: string;
  emotionPrimary?: string;
  emotionSecondary?: string;
  paletteSource: 'artwork' | 'scenes' | 'fallback';
  /** Fingerprint of the CreativeBrief that produced this version. */
  briefFingerprint?: string;
  /** Theme-family bias used for this execution. */
  familyBias?: string;
  /** Prompt used to generate the theme's background image (debug/refine). */
  backgroundPrompt?: string;
  /** Visual metaphor chosen for the background. */
  backgroundConceptId?: string;
  backgroundConceptLabel?: string;
  /** Why the execution was chosen: brief / lyrics / emotion / genre / rotation. */
  backgroundConceptReason?: string;
  /** The specific keyword, emotion or genre that matched. */
  backgroundConceptMatch?: string;
  /** Short preview of the lyrics / lyric themes that drove concept selection. */
  backgroundLyricsInput?: string;
  /** Error message if background image generation failed. */
  backgroundError?: string;
  /** Whether artwork was available when generation ran. */
  artworkUrl?: string | null;
  /** True when this version is a Scene Pack (multi-layer 3D world) rather than a Living Image. */
  scenePack?: boolean;
  /** The shared world brief the scene pack layers were generated from (debug/refine). */
  scenePackPrompt?: string;
}

/**
 * A generated theme version living inside a single project (stored on the
 * video doc). Generating always appends a new version — never overwrites.
 * Editing the active theme updates that version in place. Because the payload
 * is a plain CustomThemeConfig, a version can later be copied into the user's
 * theme library ("Save to My Themes") without any shape change.
 */
export interface ThemeVersion {
  id: string;
  /** AI-generated display name, e.g. "Midnight Echo". */
  name: string;
  /** One-line AI rationale shown in the UI. */
  description?: string;
  config: CustomThemeConfig;
  origin: 'ai' | 'manual';
  /** Creative direction id from constants/theme-interpretations.ts. */
  interpretation?: string;
  /** Reference to the ThemeExecution that produced this version's background. */
  conceptId?: string;
  /** Reference to the execution that produced this version (new code should use this). */
  executionId?: string;
  createdAt: number; // ms epoch
  aiContext?: ThemeVersionAIContext;
}

/**
 * A theme published to the community library (themes/{themeId}).
 *
 * Published from a ThemeLibraryItem with personal defaults stripped (text,
 * social links, artwork). Stats are denormalised counters updated by forks /
 * applies / exports — the ranking Cloud Function folds them into `score`.
 */
export interface CommunityTheme {
  id: string;
  name: string;
  slug: string;
  description?: string;
  config: CustomThemeConfig;
  creatorUid: string;
  origin: 'ai' | 'manual';
  /** Creative metadata carried over from the source theme (adaptive regen + collections). */
  conceptLabel?: string;
  familyBias?: string;
  aiContext?: ThemeVersionAIContext;
  /** Categorisation for collections — derived from aiContext at publish time. */
  genres: string[];
  moods: string[];
  energy?: string;
  /** 'community' = visible in-app; 'featured' = eligible for the marketing site. */
  status: 'community' | 'featured' | 'archived';
  moderationStatus: 'pending' | 'approved' | 'rejected';
  stats: {
    saves: number;
    applies: number;
    exports: number;
    views: number;
    score: number;
  };
  createdAt: number; // ms epoch
}

/** Convert a full ThemeConfig into an editable CustomThemeConfig. */
export function buildCustomFromTheme(theme: ThemeConfig): CustomThemeConfig {
  const backgroundType: CustomThemeConfig['backgroundType'] = theme.scenePackImages?.length
    ? 'scene-pack'
    : theme.backgroundVideoUrl
      ? 'video'
      : theme.backgroundImageUrl
        ? 'image'
        : theme.background.type;

  return {
    accentColor: theme.accentColor,
    textColor: theme.textColor,
    backgroundType,
    backgroundColor: theme.background.type === 'gradient'
      ? theme.background.value.match(/#[0-9a-fA-F]{6}/)?.[0] ?? '#18181b'
      : theme.background.value,
    backgroundColorEnd: theme.background.type === 'gradient'
      ? theme.background.value.match(/#[0-9a-fA-F]{6}/g)?.[1] ?? '#3b0764'
      : undefined,
    backgroundImageUrl: theme.backgroundImageUrl,
    backgroundVideoUrl: theme.backgroundVideoUrl,
    font: theme.font,
    preferredVisualizer: theme.preferredVisualizer,
    ...(theme.lightBackground !== undefined && { lightBackground: theme.lightBackground }),
    ...(theme.textShadow !== undefined && { textShadow: theme.textShadow }),
    ...(theme.lyricsBackdrop !== undefined && { lyricsBackdrop: theme.lyricsBackdrop }),
  };
}

/** Convert a user-editable CustomThemeConfig into a full ThemeConfig suitable for the renderer. */
export function buildThemeFromCustom(config: CustomThemeConfig): ThemeConfig {
  let background: ThemeBackground;
  if (config.backgroundType === 'gradient' && config.backgroundColorEnd) {
    background = {
      type: 'gradient',
      value: `linear-gradient(135deg, ${config.backgroundColor} 0%, ${config.backgroundColorEnd} 100%)`,
    };
  } else {
    // 'solid' and 'image' both receive a solid CSS background colour
    background = { type: 'solid', value: config.backgroundColor };
  }

  const textShadow =
    config.textShadow ?? `0 2px 12px rgba(0,0,0,0.7)`;

  return {
    id: 'custom',
    name: 'Custom',
    description: 'Your custom theme',
    category: 'Custom',
    background,
    backgroundType: config.backgroundType,
    accentColor: config.accentColor,
    textColor: config.textColor,
    textShadow,
    font: config.font,
    placeholders: { mainText: 'Track Title', subText: 'Artist Name' },
    preferredVisualizer: config.preferredVisualizer,
    visualizerOpacity: 1,
    lightBackground: config.lightBackground,
    ...(config.lyricsBackdrop ? { lyricsBackdrop: config.lyricsBackdrop } : {}),
    ...(config.useBlurredBackground ? { useBlurredBackground: true } : {}),
    ...(config.lyricStyle ? { lyricStyle: config.lyricStyle } : {}),
    ...(config.overlayEffect ? { overlayEffect: config.overlayEffect } : {}),
    ...(config.overlayEffects !== undefined
      ? { overlayEffects: config.overlayEffects }
      : {}),
    ...(config.motionIntensity ? { motionIntensity: config.motionIntensity } : {}),
    ...(config.cameraMotion ? { cameraMotion: config.cameraMotion } : {}),
    ...(config.motionEffect ? { motionEffect: config.motionEffect } : {}),
    ...(config.transitionStyle ? { transitionStyle: config.transitionStyle } : {}),
    ...(config.backgroundTexture ? { backgroundTexture: config.backgroundTexture } : {}),
    ...(config.artworkLayout ? { artworkLayout: config.artworkLayout } : {}),
    // Only carry the media URLs when the background type matches.
    // For solid/gradient types the URLs must be ignored so the renderer shows
    // the colour/gradient instead of a previously-uploaded file.
    ...(config.backgroundType === 'image' && config.backgroundImageUrl
      ? { backgroundImageUrl: config.backgroundImageUrl }
      : {}),
    ...(config.backgroundType === 'video' && config.backgroundVideoUrl
      ? { backgroundVideoUrl: config.backgroundVideoUrl }
      : {}),
    // Scene Pack: keep the hero image for thumbnails/cards and the depth
    // layers for the Three.js gallery. The renderer prefers the gallery whenever
    // backgroundType is 'scene-pack'.
    ...(config.backgroundType === 'scene-pack' && config.backgroundImageUrl
      ? { backgroundImageUrl: config.backgroundImageUrl }
      : {}),
    ...(config.scenePackImages?.length ? { scenePackImages: config.scenePackImages } : {}),
  };
}

export const getThemeById = (id: ThemeId): ThemeConfig | undefined => {
  return THEMES.find((theme) => theme.id === id);
};

export const DEFAULT_THEME_ID: ThemeId = 'hip-hop';

/**
 * Pick a built-in styling preset that fits the song's character. Used when the
 * user has no default theme so the editor's Styling > Presets section shows a
 * named preset instead of "Custom".
 */
export function pickDefaultPresetForSong(analysis: {
  energy?: 'low' | 'mid' | 'high';
  genre?: string;
  mood?: string;
  bpm?: number | null;
} | null): ThemeId {
  if (!analysis) return 'cinematic';

  const genre = (analysis.genre ?? '').toLowerCase();
  const mood = (analysis.mood ?? '').toLowerCase();

  // Genre-driven picks first — these override the broad energy buckets.
  if (/\b(hip\s?hop|rap|trap|drill|grime)\b/.test(genre)) return 'hip-hop';
  if (/\b(ambient|classical|lofi|lo-fi|jazz|chill|downtempo|meditation)\b/.test(genre)) return 'blurred-center';
  if (/\b(edm|electronic|dance|house|techno|dubstep|drum\s?and\s?bass|dnb)\b/.test(genre)) return 'energetic';

  // Energy / BPM fallback.
  if (analysis.energy === 'high' || (analysis.bpm ?? 0) >= 130) return 'energetic';
  if (analysis.energy === 'low' || ((analysis.bpm ?? 999) < 90 && analysis.energy !== 'mid')) return 'blurred-center';

  // Mood fallback for mid-energy tracks.
  if (/\b(sad|melanchol|emotional|heartbreak|lonely|dark)\b/.test(mood)) return 'cinematic';
  if (/\b(happy|upbeat|feel\s?good|party|summer)\b/.test(mood)) return 'energetic';

  return 'cinematic';
}
