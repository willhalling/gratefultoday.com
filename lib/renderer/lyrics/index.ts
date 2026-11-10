/**
 * lib/renderer/lyrics/index.ts — the LyricBand dispatcher (LyricBand.tsx:
 * 47–162): resolves phrases, the size multiplier and the slotHeight fallback,
 * then routes to the Canvas2D port of the active subtitle mode:
 *
 *   headline   → headline.ts   (HeadlineSlot.tsx)
 *   wave       → wave.ts       (WaveSlot.tsx)
 *   tiktok-fan → tiktok-fan.ts (TikTokFanSlot.tsx)
 *   synth family (clean-fade, impact, …) → synth.ts (ADSR envelope presets)
 *   *          → kinetic.ts    (AnimatedLyricsSlot → InkBleed, LyricBand's
 *                            hardcoded kinetic path)
 *
 * Layouts call the returned function through the Phase 1.4 slot interface;
 * the orchestrator (overlays/index.ts) binds frame + frequencyData per frame.
 */
import type { FrameContext } from '../frame-context';
import { TIKTOK_FONT_FAMILY } from '../overlays/layouts/tiktok-shared';
import { buildLines } from './shared';
import { splitLongPhrases } from './phrase-split';
import { drawHeadline, prepareHeadline } from './headline';
import { drawWave, prepareWave } from './wave';
import { drawTikTokFan, prepareTikTokFan } from './tiktok-fan';
import { drawKinetic, prepareKinetic } from './kinetic';
import { drawSynth, isSynthModeId, prepareSynth } from './synth';

export interface LyricBandGeometry {
  left: number;
  top: number;
  width: number;
  height: number;
  compositionHeight: number;
  bandTop: number;
}

/** Per-frame lyric-band renderer (frame + spectrum bound by the caller). */
export type LyricBandFrameDrawFn = (
  ctx: CanvasRenderingContext2D,
  band: LyricBandGeometry,
  frame: number,
  frequencyData: ArrayLike<number>,
) => void;

export function createLyricBandRenderer(fctx: FrameContext): LyricBandFrameDrawFn | null {
  if (!fctx.hasLyrics) return null;

  // sharedProps (VisualizerComposition.tsx:1020–1026) — hasLyrics gates these.
  const words = fctx.effectiveLyricsWords ?? [];
  const phrases = fctx.effectiveLyricsLines;
  const fps = fctx.fps;
  const mode = fctx.effectiveSubtitle.mode;
  const fontSizeScale =
    fctx.effectiveSubtitle.size === 'small' ? 0.72 : fctx.effectiveSubtitle.size === 'large' ? 1.35 : 1;
  const theme = fctx.effectiveTheme;
  // TikTok Sans for every text role on the TikTok layout (tikTokType.ts);
  // all other layouts keep the theme font.
  const fontFamily = fctx.isTikTokLayout ? TIKTOK_FONT_FAMILY : fctx.fontFamily;

  // LyricBand.tsx:70–78 — auto-build phrases from word timings when absent.
  // Stored phrases are capped at a readable size first: speech transcripts
  // arrive as whole 30-word segments, which every mode would otherwise cram
  // into one unreadable block (see phrase-split.ts).
  const resolvedPhrases =
    phrases && phrases.length > 0
      ? splitLongPhrases(phrases, words)
      : buildLines(words, fps).map((l) => ({
          text: l.text,
          start: l.startFrame / fps,
          end: l.endFrame / fps,
        }));

  // Per-mode memoised state (the slots' useMemo chains run once per fixture).
  const prepared =
    mode === 'headline'
      ? { kind: 'headline' as const, state: prepareHeadline(words) }
      : mode === 'wave'
        ? { kind: 'wave' as const, state: prepareWave(words) }
        : mode === 'tiktok-fan'
          ? { kind: 'tiktok-fan' as const, state: prepareTikTokFan(words, resolvedPhrases, fps) }
          : isSynthModeId(mode)
            ? { kind: 'synth' as const, state: prepareSynth(mode, resolvedPhrases) }
            : { kind: 'kinetic' as const, state: prepareKinetic(resolvedPhrases, words, fps) };

  return (ctx, band, frame, frequencyData) => {
    // LyricBand.tsx:82 — slotHeight falls back to the composition height.
    const slotHeight = band.height || band.compositionHeight;
    const w = band.width;
    const h = slotHeight;
    ctx.save();
    ctx.translate(band.left, band.top);
    switch (prepared.kind) {
      case 'headline':
        drawHeadline(ctx, prepared.state, { width: w, height: h, theme, fontFamily, fontSizeScale }, frame, fps);
        break;
      case 'wave':
        drawWave(ctx, prepared.state, { width: w, height: h, theme, fontFamily, fontSizeScale }, frame, fps);
        break;
      case 'tiktok-fan':
        drawTikTokFan(ctx, prepared.state, { words, width: w, height: h, theme, fontSizeScale, fontFamily }, frame, fps);
        break;
      case 'synth':
        drawSynth(ctx, prepared.state, { width: w, height: h, theme, fontFamily, fontSizeScale }, frame, fps, frequencyData);
        break;
      default:
        drawKinetic(ctx, prepared.state, { width: w, height: h, theme, fontFamily, fontSizeScale }, frame, fps, frequencyData);
    }
    ctx.restore();
  };
}
