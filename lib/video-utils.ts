export function createSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateVideoId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const DEFAULT_VIDEO_SETTINGS = {
  speed: 0.8,
  reverb: 0,
  pitch: 0,
  bassBoost: 0,
  volume: 100,
  cropStart: 0,
  cropEnd: 10,
  selectedPreset: '',
  location: 'none',
  voiceoverDelay: 0,
  backgroundDuringVO: 30,
  voiceoverVolume: 100,
  // Shared text settings
  textFont: 'Playfair Display',
  textFontSize: 96,
  textOpacity: 100,
  textOverlayDarkness: 60,
  // Intro settings
  introText: '',
  introDelaySeconds: 5,
  introPosition: 'center',
  // Outro settings
  outroText: '',
  outroPosition: 'center',
  outroStartBeforeEnd: 6,
  loopCount: 1,
  loopCrossfade: 2,
};

export const DEFAULT_VIDEO_OUTPUT_SETTINGS = {
  filename: `slowed-reverb-${Date.now()}`,
  overlayEffect: 'none',
  transitionColor: '#525252',
  showCircularTransition: true,
  showCircleTransitionStart: true,
  showCircleTransitionEnd: true,
};

export interface VideoMetadata {
  name: string;
  slug: string;
  createdAt: number;
  updatedAt: number;
  userId: string;
}

export interface VideoData extends VideoMetadata {
  advancedSettings: typeof DEFAULT_VIDEO_SETTINGS;
  videoSettings: typeof DEFAULT_VIDEO_OUTPUT_SETTINGS;
  audioUrl?: string;
  backgroundUrl?: string;
  voiceoverUrl?: string;
}
