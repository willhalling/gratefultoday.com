/**
 * Build a ThemeConfig-shaped object from flat per-video visual settings.
 *
 * The renderer and preview both consume `ThemeConfig` (used by layout
 * components). This helper lets the new flat `VisualizerSettings` model
 * feed into that existing renderer without changing layout components.
 */
import type { ThemeConfig } from '@/constants/themes';
import type { VisualizerSettings } from '@/lib/renderer/types';

export function visualStyleToThemeConfig(
  settings: VisualizerSettings | undefined,
): ThemeConfig {
  const s = settings ?? {};
  // If a background image URL exists but backgroundType was never explicitly
  // set (e.g. older callers only wrote backgroundImageUrl), treat it as an
  // image so the renderer keeps showing it.
  const backgroundType =
    s.backgroundType || (s.backgroundImageUrl ? 'image' : 'solid');
  const backgroundColor = s.backgroundColor ?? '#18181b';
  const backgroundColorEnd = s.backgroundColorEnd;

  let background: ThemeConfig['background'];
  if (backgroundType === 'gradient' && backgroundColorEnd) {
    background = {
      type: 'gradient',
      value: `linear-gradient(135deg, ${backgroundColor} 0%, ${backgroundColorEnd} 100%)`,
    };
  } else {
    background = { type: 'solid', value: backgroundColor };
  }

  const textColor = s.textColor ?? '#FFFFFF';
  const accentColor = s.accentColor ?? '#A855F7';
  const font = s.font ?? 'energetic';
  const preset = s.preferredVisualizer ?? (s.preset as ThemeConfig['preferredVisualizer']) ?? 'bars';

  return {
    id: 'custom',
    name: 'Custom',
    description: 'Video visual style',
    category: 'Custom',
    background,
    backgroundType,
    backgroundImageUrl:
      backgroundType === 'image' || backgroundType === 'artwork' || backgroundType === 'scene-pack'
        ? s.backgroundImageUrl ?? undefined
        : undefined,
    backgroundVideoUrl:
      backgroundType === 'video' ? s.backgroundVideoUrl ?? undefined : undefined,
    accentColor,
    textColor,
    textShadow: s.textShadow ?? '0 2px 12px rgba(0,0,0,0.7)',
    font,
    placeholders: { mainText: 'Track Title', subText: 'Artist Name' },
    preferredVisualizer: preset,
    visualizerOpacity: 1,
    lightBackground: s.lightBackground,
    ...(s.lyricsBackdrop ? { lyricsBackdrop: s.lyricsBackdrop } : {}),
    ...(s.useBlurredBackground ? { useBlurredBackground: true } : {}),
    ...(s.lyricStyle ? { lyricStyle: s.lyricStyle } : {}),
    ...(s.overlayEffect ? { overlayEffect: s.overlayEffect } : {}),
    ...(s.overlayEffects !== undefined ? { overlayEffects: s.overlayEffects } : {}),
    ...(s.waveIntensity !== undefined ? { motionIntensity: s.waveIntensity } : {}),
    ...(s.cameraMotion ? { cameraMotion: s.cameraMotion } : {}),
    ...(s.motionEffect ? { motionEffect: s.motionEffect } : {}),
    ...(s.motionEffectIntensity !== undefined && s.motionEffectIntensity !== 'off'
      ? { motionEffectIntensity: s.motionEffectIntensity }
      : {}),
    ...(s.transitionStyle ? { transitionStyle: s.transitionStyle } : {}),
    ...(s.backgroundTexture ? { backgroundTexture: s.backgroundTexture } : {}),
    ...(s.artworkLayout ? { artworkLayout: s.artworkLayout } : {}),
    // NOTE: flat `sceneImages` are intentionally NOT copied to
    // `scenePackImages` — frame-context reads them from the flat props and
    // routes them to the cut-world branch; copying them here would trip the
    // (descoped) scene-pack branch instead, which outranks scene-images.
  };
}
