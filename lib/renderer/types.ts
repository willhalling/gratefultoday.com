import type { ThemeFontKey } from '@/constants/fonts';
import type { LayoutId } from '@/constants/layouts';
import type { LyricModeId } from '@/constants/lyric-modes';
import type { OverlayEffect } from '@/constants/overlays';
import type { VisualizerPreset } from '@/constants/visualizers';
import type { CameraMotion } from '@/lib/renderer/vendor/three/camera/cameraMotion';

export type { ReleaseVariantId } from '@/constants/release-variants';

export interface WordTiming {
  word: string;
  start: number;
  end: number;
  isHighlighted?: boolean;
  reliable?: boolean;
  confidence?: number;
  interpolated?: true;
  hidden?: boolean;
  timingConfirmed?: boolean;
  repaired?: boolean;
  guessed?: boolean;
  hold_overlap?: boolean;
}

export type SubtitleMode = LyricModeId;
export type SubtitleSize = 'small' | 'medium' | 'large';

export interface SubtitleConfig {
  mode: SubtitleMode;
  size: SubtitleSize;
  overlay?: boolean;
}

export type LyricStyle =
  | 'auto'
  | 'StackedEcho'
  | 'DepthOfField'
  | 'StaggerCascade'
  | 'InkBleed'
  | 'SplitReveal'
  | 'StampedImpact'
  | 'BreathFloat'
  | 'WordByWordStack'
  | 'JustifiedLetterFall'
  | 'JustifiedLetterWave'
  | 'JustifiedLetterBlur'
  | 'JustifiedLetterFlip'
  | 'JustifiedLetterBounce'
  | 'JustifiedLetterRise';

export interface VisualizerSettings {
  preset?: string;
  preferredVisualizer?: VisualizerPreset;
  accentColor?: string;
  textColor?: string;
  textShadow?: string;
  font?: ThemeFontKey;
  lightBackground?: boolean;
  lyricsBackdrop?: string;
  backgroundType?: 'solid' | 'gradient' | 'image' | 'video' | 'scene-pack' | 'artwork';
  backgroundColor?: string;
  backgroundColorEnd?: string;
  backgroundImageUrl?: string | null;
  backgroundVideoUrl?: string | null;
  backgroundTexture?: 'none' | 'paper' | 'halftone' | 'mesh' | 'dust' | 'film';
  useBlurredBackground?: boolean;
  backgroundBlur?: number;
  transitionStyle?: 'fade' | 'slide' | 'wipe';
  artworkLayout?: LayoutId;
  lyricStyle?: LyricStyle;
  overlayEffect?: OverlayEffect;
  overlayEffects?: OverlayEffect[];
  waveIntensity?: 'off' | 'subtle' | 'balanced' | 'intense' | number;
  motionEffect?: 'none' | 'pulse' | 'liquid-glass' | 'rgb-glitch' | 'rain' | 'dream' | 'colour-grade';
  motionEffectIntensity?: 'off' | 'subtle' | 'balanced' | 'intense' | number;
  cameraMotion?: CameraMotion;
  lyricOffsetSeconds?: number;
  hook?: string;
  animateHook?: boolean;
  tiktokFrameColor?: string;
  tiktokFrameTextColor?: string;
}
