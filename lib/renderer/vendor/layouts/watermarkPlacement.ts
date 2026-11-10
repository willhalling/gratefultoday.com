import type { LayoutId } from '@/constants/layouts';

/**
 * Watermark placement resolver.
 *
 * Layouts with large cover art anchor the watermark badge to the
 * bottom-middle of the artwork (inside it, slight inset) so it never covers
 * titles, lyrics or social icons. Every other layout falls back to an edge
 * position chosen per layout (left / center / right).
 *
 * Geometry mirrors the cover rects in each layout component — keep them in
 * sync when a layout moves its artwork.
 */

export interface CoverRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type WatermarkPlacement =
  | { type: 'cover'; rect: CoverRect }
  | { type: 'edge'; align: 'left' | 'center' | 'right' };

export interface WatermarkPlacementInput {
  layoutId: LayoutId;
  width: number;
  height: number;
  isPortrait: boolean;
  hasCoverImage: boolean;
}

/** SidebarLayout (floating-card / landscape centered) — right column cover. */
function sidebarCoverRect(width: number, height: number): CoverRect {
  const size = height * 0.84;
  return { left: width - width * 0.03 - size, top: height * 0.1, width: size, height: size };
}

/** StackedLayout (portrait centered) — square cover at the top. */
function stackedCoverRect(width: number, height: number): CoverRect {
  const size = width * 0.84;
  return { left: width * 0.08, top: height * 0.045, width: size, height: size };
}

export function getWatermarkPlacement({
  layoutId,
  width,
  height,
  isPortrait,
  hasCoverImage,
}: WatermarkPlacementInput): WatermarkPlacement {
  if (hasCoverImage) {
    switch (layoutId) {
      case 'centered':
        return {
          type: 'cover',
          rect: isPortrait ? stackedCoverRect(width, height) : sidebarCoverRect(width, height),
        };
      case 'floating-card':
        return { type: 'cover', rect: sidebarCoverRect(width, height) };
      case 'full-bleed': {
        const size = height * 0.68;
        return {
          type: 'cover',
          rect: { left: (width - size) / 2, top: (height - size) / 2, width: size, height: size },
        };
      }
      case 'center-stage': {
        // Landscape: cover is relatively small and sits high, so the badge
        // lives in the bottom-right corner instead of overlapping the artwork.
        if (!isPortrait) return { type: 'edge', align: 'right' };
        const size = width * 0.62;
        return {
          type: 'cover',
          rect: {
            left: (width - size) / 2,
            top: height * 0.07,
            width: size,
            height: size,
          },
        };
      }
      case 'split': {
        if (isPortrait) {
          const size = width * 0.7;
          return {
            type: 'cover',
            rect: {
              left: (width - size) / 2,
              top: height * 0.45 * 0.5 - size / 2,
              width: size,
              height: size,
            },
          };
        }
        const size = height * 0.6;
        const panelW = width / 2;
        return {
          type: 'cover',
          rect: {
            left: (panelW - size) / 2,
            top: (height - size) / 2,
            width: size,
            height: size,
          },
        };
      }
      case 'split-reverse': {
        if (isPortrait) {
          const size = width * 0.7;
          return {
            type: 'cover',
            rect: {
              left: (width - size) / 2,
              top: height * 0.5 + (height * 0.44 - size) / 2,
              width: size,
              height: size,
            },
          };
        }
        const size = height * 0.6;
        const panelW = width / 2;
        return {
          type: 'cover',
          rect: {
            left: panelW + (panelW - size) / 2,
            top: (height - size) / 2,
            width: size,
            height: size,
          },
        };
      }
      case 'editorial': {
        const size = isPortrait ? width * 0.55 : height * 0.5;
        return {
          type: 'cover',
          rect: isPortrait
            ? { left: (width - size) / 2, top: height * 0.32, width: size, height: size }
            : {
                left: width - width * 0.06 - size,
                top: (height - size) / 2,
                width: size,
                height: size,
              },
        };
      }
      case 'vinyl': {
        const size = isPortrait ? width * 0.7 : Math.min(width, height) * 0.55;
        return {
          type: 'cover',
          rect: isPortrait
            ? { left: (width - size) / 2, top: height * 0.12, width: size, height: size }
            : { left: width * 0.08, top: (height - size) / 2, width: size, height: size },
        };
      }
      default:
        break;
    }
  }

  // Edge placements — small-cover and no-cover layouts.
  switch (layoutId) {
    // Small corner cover owns the bottom-left; badge goes bottom-right.
    case 'corner-pocket':
      return { type: 'edge', align: 'right' };
    // Header thumb is small; lyrics own the centre — badge goes bottom-right.
    case 'header':
    case 'cinematic':
    case 'lower-third':
      return { type: 'edge', align: 'right' };
    default:
      return { type: 'edge', align: 'center' };
  }
}
