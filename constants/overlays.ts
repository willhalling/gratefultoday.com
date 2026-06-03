export const OVERLAY_OPTIONS = [
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
  },
  {
    key: 'sparkles',
    label: 'Sparkles',
    description: 'Glittery sparkle particles for dreamy effect',
    file: '/backgrounds/sparkles.mp4',
    opacity: 0.4,
    mixBlendMode: 'screen',
    filter: 'brightness(1.2) contrast(1.1)',
  },
  // {
  //   key: 'fog',
  //   label: 'Fog',
  //   description: 'Soft fog overlay for atmospheric mood',
  //   file: '/backgrounds/fog.webm',
  //   opacity: 0.5,
  //   mixBlendMode: 'soft-light',
  //   filter: 'blur(1px)',
  // },
] as const;

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
