/**
 * Cover imprint — shared configuration, geometry and GLSL for compositing
 * the cover art INSIDE a shader atmosphere (rain glass, dream flow, pulse
 * ripple, glitch tears), so the scene carries a ghost of the artwork while
 * the layout draws the real cover sharp and static on top.
 *
 * Three things live here so everything stays in sync:
 *   1. COVER_IMPRINT_SCALE — the ONE knob for how much larger the imprint
 *      is than the cover. Global on purpose: nudge it once and every
 *      effect + layout follows.
 *   2. coverImprintRectForLayout() — the cover's on-screen rect per layout
 *      (mirrors each layout's own geometry — if a layout moves its cover,
 *      update the matching branch here).
 *   3. The GLSL chunk (uniforms + mask/emboss) every atmosphere shader
 *      embeds. Sampler calls stay in each shader (GLSL1 texture2D vs GLSL3
 *      texture/textureLod differ); this chunk is version-agnostic.
 *
 * Layouts WITHOUT an imprint: fullscreen / minimal / cinematic (no cover),
 *      vinyl (the rotating circular record would fight a static ghost), and the
 *      small-thumbnail layouts (header, lower-third, corner-pocket) where a halo
 *      around a tiny thumb adds nothing.
 */

import type { LayoutId } from '@/constants/layouts';
import {
  glassImprintGlsl,
  glassImprintUniformsGlsl,
} from './glass/glassGlsl';
import type { ImprintRect } from './imprint';

export type { ImprintRect as CoverImprintRect };

/** Imprint enlargement about the cover centre — the ghost halo width. */
export const COVER_IMPRINT_SCALE = 0.9;

/**
 * The cover's on-screen rect (pixels, top-left origin, entrance animations
 * excluded) exactly as the layout draws its cover. Null for layouts without a
 * dominant cover element.
 */
export function coverRectForLayout(
  layoutId: LayoutId,
  width: number,
  height: number,
  isPortrait: boolean,
): ImprintRect | null {
  switch (layoutId) {
    case 'center-stage': {
      const size = isPortrait ? width * 0.62 : height * 0.42;
      const top = isPortrait ? height * 0.07 : height * 0.08;
      return { x: (width - size) / 2, y: top, width: size, height: size };
    }
    case 'centered':
      // 'centered' renders Stacked in portrait, Sidebar in landscape.
      if (isPortrait) {
        return { x: width * 0.08, y: height * 0.045, width: width * 0.84, height: width * 0.84 };
      } else {
        const size = height * 0.84;
        return { x: width * 0.97 - size, y: height * 0.1, width: size, height: size };
      }
    case 'floating-card': {
      const size = isPortrait ? width * 0.72 : height * 0.84;
      const x = isPortrait ? (width - size) / 2 : width * 0.97 - size;
      const top = isPortrait ? height * 0.08 : height * 0.1;
      return { x, y: top, width: size, height: size };
    }
    case 'full-bleed': {
      const size = isPortrait ? width * 0.66 : height * 0.68;
      const top = isPortrait ? height * 0.42 - width * 0.33 : height * 0.16;
      return { x: (width - size) / 2, y: top, width: size, height: size };
    }
    case 'split':
    case 'split-reverse': {
      if (isPortrait) {
        const size = width * 0.7;
        const top =
          layoutId === 'split'
            ? height * 0.225 - width * 0.35
            : height * 0.72 - width * 0.35;
        return { x: (width - size) / 2, y: top, width: size, height: size };
      } else {
        const size = height * 0.6;
        const panelX = layoutId === 'split' ? 0 : width / 2;
        return {
          x: panelX + (width / 2 - size) / 2,
          y: height * 0.2,
          width: size,
          height: size,
        };
      }
    }
    case 'editorial': {
      const size = isPortrait ? width * 0.55 : height * 0.5;
      const x = isPortrait ? (width - size) / 2 : width * 0.94 - size;
      const top = isPortrait ? height * 0.32 : height * 0.25;
      return { x, y: top, width: size, height: size };
    }
    default:
      return null;
  }
}

/**
 * The cover's on-screen rect enlarged by COVER_IMPRINT_SCALE about its centre.
 * Used by shader atmospheres that draw a ghost of the cover behind the layout.
 */
export function coverImprintRectForLayout(
  layoutId: LayoutId,
  width: number,
  height: number,
  isPortrait: boolean,
): ImprintRect | null {
  const base = coverRectForLayout(layoutId, width, height, isPortrait);
  if (!base) return null;

  const grown = base.width * COVER_IMPRINT_SCALE;
  const cx = base.x + base.width / 2;
  const cy = base.y + base.height / 2;
  return { x: cx - grown / 2, y: cy - grown / 2, width: grown, height: grown };
}

/** Uniform declarations every imprint-capable shader needs. */
export const COVER_IMPRINT_UNIFORMS_GLSL = glassImprintUniformsGlsl('Cover');

/**
 * Glass-pane imprint for the cover art. uCoverRect is (x, y, w, h) in
 * screen-normalised space (y up, bottom-left origin); uCoverAlpha 0 disables
 * the imprint. The caller samples uCover itself (texture2D / texture /
 * textureLod depending on the shader) at coverLocalUv().
 */
export const COVER_IMPRINT_GLSL = glassImprintGlsl('Cover');
