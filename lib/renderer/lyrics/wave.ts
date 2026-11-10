/**
 * lib/renderer/lyrics/wave.ts — Canvas2D port of WaveSlot.tsx.
 * Grouping + per-song wave variant logic lives in shared.ts (verbatim).
 *
 * The DOM rows are CSS-MASKED (WaveSlot.tsx:271–275 — linear-gradient alpha
 * mask, transparent at both band edges). Canvas equivalent: rows are drawn
 * into a band-sized temp canvas, then `destination-in` with the same gradient
 * (element alpha × mask alpha — identical compositing).
 *
 * Row geometry: each row div is `top: y − fontSize/2` with lineHeight:1
 * (:237, :252), so the text line box is centred on `y` — canvas
 * textBaseline 'middle' at (width/2 + swayX, y).
 */
import type { WordTiming } from '@/lib/renderer/types';
import type { ThemeConfig } from '@/constants/themes';
import { applyTextShadow, setLetterSpacingEm } from '../overlays/text';
import {
  waveDeriveVariant,
  waveGroupWords,
  WAVE_ROWS_ABOVE,
  WAVE_ROWS_BELOW,
  type WaveVariant,
  type WaveWordItem,
} from './shared';

export interface WavePrepared {
  items: WaveWordItem[];
  variant: WaveVariant;
}

export function prepareWave(words: WordTiming[]): WavePrepared {
  return { items: waveGroupWords(words), variant: waveDeriveVariant(words) };
}

export interface WaveDrawArgs {
  width: number;
  height: number;
  theme: ThemeConfig;
  fontFamily?: string;
  fontSizeScale: number;
}

export function drawWave(
  ctx: CanvasRenderingContext2D,
  prepared: WavePrepared,
  args: WaveDrawArgs,
  frame: number,
  fps: number,
): void {
  const { width, height, theme, fontSizeScale } = args;
  const fontFamily = args.fontFamily ?? 'Inter, system-ui, sans-serif';
  const { items, variant } = prepared;
  if (items.length === 0) return;

  const t = frame / fps;
  const elapsed = t;

  // :159–166 — active item: last whose start <= t.
  let activeIdx = -1;
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i].start <= t) {
      activeIdx = i;
      break;
    }
  }
  if (activeIdx < 0) activeIdx = 0;

  // :171–179 — layout (isPortrait is the BAND's aspect, not the frame's).
  const isPortrait = height > width;
  const fontSize = Math.round(
    (isPortrait ? height * 0.045 : Math.min(width * 0.04, height * 0.075)) * fontSizeScale,
  );
  const rowGap = Math.round(fontSize * 0.18);
  const rowH = fontSize + rowGap;
  const sideRange = Math.min(width * 0.16, height * 0.18);
  const accent = theme.accentColor || '#ffffff';
  // position is 'middle' for every LyricBand consumer (:179).
  const centreY = height / 2;

  // :191–198 — linearly interpolated continuous index.
  let continuousIdx = activeIdx;
  if (activeIdx < items.length - 1) {
    const a = items[activeIdx];
    const b = items[activeIdx + 1];
    const span = Math.max(0.05, b.start - a.start);
    const linear = Math.min(1, Math.max(0, (t - a.start) / span));
    continuousIdx = activeIdx + linear;
  }

  const visibleAbove = WAVE_ROWS_ABOVE * rowH;
  const visibleBelow = WAVE_ROWS_BELOW * rowH;
  const startIdx = Math.max(0, Math.floor(continuousIdx) - WAVE_ROWS_ABOVE);
  const endIdx = Math.min(items.length - 1, Math.floor(continuousIdx) + WAVE_ROWS_BELOW + 1);

  // Rows draw into a temp canvas so the CSS mask can be replicated with
  // destination-in (the mask applies to the composited rows incl. shadows).
  const rowsCanvas = document.createElement('canvas');
  rowsCanvas.width = Math.max(1, Math.round(width));
  rowsCanvas.height = Math.max(1, Math.round(height));
  const rctx = rowsCanvas.getContext('2d');
  if (!rctx) return;

  rctx.textAlign = 'center';
  rctx.textBaseline = 'middle';
  setLetterSpacingEm(rctx, 0.05, fontSize);

  for (let idx = startIdx; idx <= endIdx; idx++) {
    const offset = idx - continuousIdx;
    const y = centreY + offset * rowH;
    if (y < centreY - visibleAbove - rowH) continue;
    if (y > centreY + visibleBelow + rowH) continue;

    const phase =
      (y / height) * variant.waveNumber * Math.PI * 2 +
      elapsed * variant.waveSpeed * Math.PI * 2 +
      variant.phaseOffset;
    const primary = Math.sin(phase);
    const secondary = Math.sin(phase * variant.harmonicRatio + variant.phaseOffset * 0.5);
    const blended = primary * (1 - variant.harmonicMix) + secondary * variant.harmonicMix;
    const swayX = Number((blended * sideRange * variant.amplitudeMul).toFixed(2));

    const isActive = idx === activeIdx;
    const dist = Math.abs(offset);
    const baseAlpha = isActive ? 1 : Math.max(0.18, 0.7 - dist * 0.12);
    const color = isActive ? accent : `rgba(255,255,255,${baseAlpha.toFixed(3)})`;
    const weight = isActive ? 800 : 500;

    rctx.save();
    rctx.font = `${weight} ${fontSize}px ${fontFamily}`;
    applyTextShadow(rctx, isActive ? '0 2px 18px rgba(0,0,0,0.6)' : '0 1px 6px rgba(0,0,0,0.5)');
    rctx.fillStyle = color;
    rctx.fillText(items[idx].text.toUpperCase(), width / 2 + swayX, y);
    rctx.restore();
  }

  // CSS mask: linear-gradient(to bottom, transparent 0%, black 22%, black 78%,
  // transparent 100%) — alpha mask over the band rect.
  rctx.save();
  rctx.globalCompositeOperation = 'destination-in';
  const mask = rctx.createLinearGradient(0, 0, 0, height);
  mask.addColorStop(0, 'rgba(0,0,0,0)');
  mask.addColorStop(0.22, 'rgba(0,0,0,1)');
  mask.addColorStop(0.78, 'rgba(0,0,0,1)');
  mask.addColorStop(1, 'rgba(0,0,0,0)');
  rctx.fillStyle = mask;
  rctx.fillRect(0, 0, width, height);
  rctx.restore();

  ctx.drawImage(rowsCanvas, 0, 0, width, height);
}
