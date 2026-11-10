export type OverlayEffect = 'none' | 'grain' | 'sparkles' | 'dust' | 'snow' | 'vignette';
export type OverlayCharacter = 'texture' | 'organic' | 'sparkle' | 'framing';

export const OVERLAY_OPTIONS: {
  key: OverlayEffect;
  label: string;
  description: string;
  file: string | null;
  opacity: number;
  mixBlendMode: string;
  filter: string;
  character?: OverlayCharacter;
}[] = [
  {
    key: 'none',
    label: 'No Overlay',
    description: 'Clean video without any overlay effect',
    file: null,
    opacity: 0,
    mixBlendMode: 'normal',
    filter: '',
  },
  {
    key: 'grain',
    label: 'Film Grain',
    description: 'Vintage film grain texture for retro aesthetic',
    file: '/backgrounds/grain.mp4',
    opacity: 0.7,
    mixBlendMode: 'overlay',
    filter: '',
    character: 'texture',
  },
  {
    key: 'sparkles',
    label: 'Sparkles',
    description: 'Glittery sparkle particles for dreamy effect',
    file: '/backgrounds/sparkles.mp4',
    opacity: 0.4,
    mixBlendMode: 'screen',
    filter: 'brightness(1.2) contrast(1.1)',
    character: 'sparkle',
  },
  {
    key: 'dust',
    label: 'Dust',
    description: 'Soft floating particles for a quiet, organic mood',
    file: null,
    opacity: 0,
    mixBlendMode: 'normal',
    filter: '',
    character: 'organic',
  },
  {
    key: 'snow',
    label: 'Snow',
    description: 'Gentle falling snow for a wintry mood',
    file: null,
    opacity: 0,
    mixBlendMode: 'normal',
    filter: '',
    character: 'organic',
  },
  {
    key: 'vignette',
    label: 'Vignette',
    description: 'Darkens the edges to keep text and wave readable',
    file: null,
    opacity: 0,
    mixBlendMode: 'normal',
    filter: '',
    character: 'framing',
  },
];

export interface OverlayConfig {
  file: string | null;
  opacity: number;
  mixBlendMode: string;
  filter: string;
}

export function getOverlayConfig(key: string): OverlayConfig {
  const option = OVERLAY_OPTIONS.find((o) => o.key === key);
  if (!option || option.key === 'none') {
    return { file: null, opacity: 0, mixBlendMode: 'normal', filter: '' };
  }
  return {
    file: option.file,
    opacity: option.opacity,
    mixBlendMode: option.mixBlendMode,
    filter: option.filter,
  };
}

export function getOverlayConfigs(keys: OverlayEffect[]): OverlayConfig[] {
  return keys.filter((k) => k !== 'none').map((k) => getOverlayConfig(k));
}
