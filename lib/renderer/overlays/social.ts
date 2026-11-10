/**
 * lib/renderer/overlays/social.ts — Canvas2D ports of
 * remotion/components/SocialIcons.tsx (the auto-positioned bottom block) and
 * SocialPanel.tsx (inline heading+icons panel). PLATFORM_ICONS /
 * extractHandle are imported verbatim (framework-free).
 */
import {
  PLATFORM_ICONS,
  extractHandle,
} from '@/lib/renderer/vendor/components/socialIcons';
import type { SocialLinksData } from '@/types/social';
import type { TextStyle } from './text';
import { drawTextLine, measureLine } from './text';
import { contrastingIconColor, drawIconCircle } from './draw';

export interface SocialTheme {
  accentColor: string;
  textColor: string;
  textShadow?: string;
}

// ─── SocialPanel (inline block) ──────────────────────────────────────────────

export interface SocialPanelOpts {
  layout: 'vertical' | 'row';
  handlePosition?: 'after' | 'before';
  align?: 'left' | 'right';
  iconSizeRatio?: number;
}

/**
 * SocialPanel measured layout: returns the drawn block height. `x` is the
 * block's left edge (align left) or right edge (align right), `top` its top.
 */
export function drawSocialPanel(
  ctx: CanvasRenderingContext2D,
  socialLinks: SocialLinksData,
  frame: { width: number; height: number },
  theme: SocialTheme,
  fontFamily: string,
  x: number,
  top: number,
  opts: SocialPanelOpts,
): number {
  if (!socialLinks || socialLinks.links.length === 0) return 0;
  const { layout, handlePosition = 'after', align = 'left', iconSizeRatio = 0.045 } = opts;
  const { width, height } = frame;
  const iconSize = height * iconSizeRatio;
  const iconColor = contrastingIconColor(theme.accentColor);
  const scale = Math.min(width, height);

  let y = top;

  if (socialLinks.heading) {
    const headingStyle: TextStyle = {
      fontSize: scale * 0.022,
      weight: '600',
      family: fontFamily,
      color: theme.textColor,
      opacity: 0.9,
      letterSpacingEm: 0.05,
      textShadow: theme.textShadow,
      textTransform: 'uppercase',
    };
    drawTextLine(ctx, socialLinks.heading, headingStyle, {
      x,
      top: y,
      align: align === 'right' ? 'right' : 'left',
    });
    y += scale * 0.022 * 1.2 + height * 0.005 + height * 0.015;
  }

  const rowGap = height * (layout === 'vertical' ? 0.015 : 0.02);
  const itemGap = height * 0.012;
  const handleStyle: TextStyle = {
    fontSize: scale * 0.02,
    weight: '500',
    family: fontFamily,
    color: theme.textColor,
    opacity: 0.85,
    textShadow: theme.textShadow,
  };

  // Measure items first so right-aligned rows can be positioned.
  const items = socialLinks.links.map((link) => {
    const hasUrl = !!link.url && link.url.trim().length > 0;
    const handle = hasUrl ? extractHandle(link.url, link.platform) : '';
    const handleW = handle ? measureLine(ctx, handle, handleStyle) : 0;
    const w = iconSize + (handle ? itemGap + handleW : 0);
    return { link, handle, w };
  });

  if (layout === 'row') {
    // Single row (wrap ignored — fixtures keep it on one line).
    const totalW = items.reduce((sum, it) => sum + it.w, 0) + rowGap * (items.length - 1);
    let cx = align === 'right' ? x - totalW : x;
    const cy = y + iconSize / 2;
    for (const it of items) {
      const iconPath = PLATFORM_ICONS[it.link.platform];
      drawIconCircle(ctx, cx + iconSize / 2, cy, iconSize, theme.accentColor, iconPath, iconColor);
      const tx = cx + iconSize + itemGap;
      if (it.handle) {
        if (handlePosition === 'before') {
          drawTextLine(ctx, it.handle, handleStyle, { x: cx, middle: cy });
          drawIconCircle(ctx, cx + (it.w - iconSize) + iconSize / 2, cy, iconSize, theme.accentColor, iconPath, iconColor);
        } else {
          drawTextLine(ctx, it.handle, handleStyle, { x: tx, middle: cy });
        }
      }
      cx += it.w + rowGap;
    }
    return y + iconSize;
  }

  // Vertical stack, right-aligned.
  for (const it of items) {
    const cy = y + iconSize / 2;
    const iconPath = PLATFORM_ICONS[it.link.platform];
    if (it.handle) {
      drawTextLine(ctx, it.handle, handleStyle, { x: x - (it.w - iconSize - itemGap), middle: cy, align: 'right' });
      drawIconCircle(ctx, x - iconSize / 2, cy, iconSize, theme.accentColor, iconPath, iconColor);
    } else {
      drawIconCircle(ctx, x - iconSize / 2, cy, iconSize, theme.accentColor, iconPath, iconColor);
    }
    y += iconSize + rowGap;
  }
  return y - rowGap;
}

// ─── SocialIcons (auto-positioned bottom block) ──────────────────────────────

export interface SocialIconsOpts {
  isPortrait: boolean;
  hasImage?: boolean;
  topOffsetPx?: number;
  backdropColor?: string;
}

/**
 * SocialIcons.tsx:188–336 — heading + wrap row of icon(+handle) items,
 * centred horizontally at the resolved top offset.
 */
export function drawSocialIcons(
  ctx: CanvasRenderingContext2D,
  socialLinks: SocialLinksData | undefined,
  frame: { width: number; height: number },
  theme: SocialTheme,
  fontFamily: string,
  opts: SocialIconsOpts,
): void {
  if (!socialLinks || socialLinks.links.length === 0) return;
  const { isPortrait, hasImage = false, topOffsetPx, backdropColor } = opts;
  const { width, height } = frame;
  const { links } = socialLinks;

  const baseSize = Math.min(width, height);
  const iconSize = isPortrait ? baseSize * 0.055 : baseSize * 0.04;
  const headingSize = isPortrait ? baseSize * 0.035 : baseSize * 0.03;
  const gap = isPortrait ? iconSize * 0.5 : iconSize * 0.4;

  const containerTop = isPortrait
    ? height * 0.88
    : hasImage
      ? height * 0.68
      : height * 0.82;
  const resolvedTop = topOffsetPx ?? containerTop;

  let y = resolvedTop;
  if (backdropColor) y += gap * 0.8;
  const contentTop = y;

  if (socialLinks.heading) {
    const headingStyle: TextStyle = {
      fontSize: headingSize,
      weight: '600',
      family: fontFamily,
      color: theme.textColor,
      opacity: 0.9,
      letterSpacingEm: 0.05,
      textShadow: theme.textShadow,
      textTransform: 'uppercase',
    };
    drawTextLine(ctx, socialLinks.heading, headingStyle, {
      x: width / 2,
      top: y,
      align: 'center',
    });
    y += headingSize * 1.2 + gap * 0.8;
  }

  const handleStyle: TextStyle = {
    fontSize: headingSize * 0.8,
    weight: '500',
    family: fontFamily,
    color: theme.textColor,
    opacity: 0.85,
  };
  const iconColor = contrastingIconColor(theme.accentColor);
  const itemGap = gap * 0.4;

  // Measure items; wrap at maxWidth like the flex-wrap container.
  const maxWidth = isPortrait ? width * 0.85 : width * 0.6;
  const items = links.map((link) => {
    const hasUrl = !!link.url && link.url.trim().length > 0;
    const handle = hasUrl ? extractHandle(link.url, link.platform) : '';
    const w =
      iconSize +
      (hasUrl && handle ? itemGap + measureLine(ctx, handle, handleStyle) : 0);
    return { link, handle, hasUrl, w };
  });
  const rows: (typeof items)[] = [];
  let cur: typeof items = [];
  let curW = 0;
  for (const it of items) {
    const nextW = curW + (cur.length > 0 ? gap : 0) + it.w;
    if (cur.length > 0 && nextW > maxWidth) {
      rows.push(cur);
      cur = [it];
      curW = it.w;
    } else {
      cur.push(it);
      curW = nextW;
    }
  }
  if (cur.length > 0) rows.push(cur);

  let contentBottom = y;
  for (const row of rows) {
    const rowW = row.reduce((sum, it) => sum + it.w, 0) + gap * (row.length - 1);
    let cx = (width - rowW) / 2;
    const cy = y + iconSize / 2;
    for (const it of row) {
      const iconPath = PLATFORM_ICONS[it.link.platform];
      drawIconCircle(ctx, cx + iconSize / 2, cy, iconSize, theme.accentColor, iconPath, iconColor);
      if (it.hasUrl && it.handle) {
        drawTextLine(ctx, it.handle, handleStyle, { x: cx + iconSize + itemGap, middle: cy });
      }
      cx += it.w + gap;
    }
    y += iconSize + gap;
    contentBottom = y - gap + iconSize;
  }

  if (backdropColor) {
    // Backdrop panel behind the whole block (poster bg images) — drawn UNDER
    // the content, so composite it afterwards via a temp canvas.
    const panelTop = resolvedTop;
    const panelBottom = contentBottom + gap * 0.8;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = backdropColor;
    ctx.fillRect(0, panelTop, width, panelBottom - panelTop);
    ctx.restore();
  }
}
