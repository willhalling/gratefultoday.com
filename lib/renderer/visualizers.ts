/**
 * lib/renderer/visualizers.ts — Canvas2D ports of the four editor visualizers:
 *
 *   bars              — BarsVisualization.tsx (SVG rects, per-bar dB mapping,
 *                       3-tap smoothing, energy/responsiveness scaling)
 *   radial-bars       — RadialBarsVisualization.tsx (same getBars core, highpass
 *                       mirrored around the circle, min-visibility floor)
 *   wave              — WaveVisualization.tsx (sinusoid point field → cubic
 *                       bezier strokes, time-driven offset)
 *   waveform-progress — WaveformVisualization.tsx (PCM downsample peaks →
 *                       Catmull-Rom closed path, played/unplayed clip halves +
 *                       playhead line)
 *
 * All are SVG in the originals — SVG rect(rx)/path(fill|stroke) and canvas
 * roundRect/Path2D rasterize through the same Skia pipeline. Pure math is
 * ported verbatim; the frame's frequencyData/overallEnergy come from
 * frame-context analysis (fft-parity proves the data), and the PCM channel
 * (for waveform downsamplePeaks) is the same browser-decoded buffer
 * useAudioData hands the composition.
 */
import {
  classicVisualizerPreset,
  isWebGLVisualizerPreset,
  type VisualizerPreset,
} from '@/constants/visualizers';
import type { FrameContext } from './frame-context';
import {
  createGlFrameInputs,
  GL_SLOT_BLEED,
  GlVisualizerRenderer,
  type GlVisualizerPreset,
} from './visualizers-gl';

// ─── Shared core (BarsVisualization.tsx:3–40) ────────────────────────────────

function processAudioValue(v: number): number {
  if (v <= 0) return 0;
  const minDb = -60;
  const maxDb = 0;
  const db = 20 * Math.log10(v);
  return Math.max(0, Math.min(1, (db - minDb) / (maxDb - minDb)));
}

export function getBars({
  totalWidth,
  itemWidth,
  frequencyData,
}: {
  totalWidth: number;
  itemWidth: number;
  frequencyData: ArrayLike<number>;
}): number[] {
  const nBars = Math.floor(totalWidth / itemWidth);
  const sampleStep = Math.max(1, Math.floor(frequencyData.length / nBars));

  const raw = Array.from({ length: nBars }).map((_, i) => {
    const start = i * sampleStep;
    const end = Math.min(start + sampleStep, frequencyData.length);
    let sum = 0;
    for (let j = start; j < end; j++) sum += frequencyData[j];
    return processAudioValue(sum / (end - start));
  });

  return raw.map((v, i) => {
    const prev = raw[Math.max(0, i - 1)];
    const next = raw[Math.min(raw.length - 1, i + 1)];
    return (prev + v + next) / 3;
  });
}

/** SVG rect rx clamps to half the smaller side; canvas roundRect follows the
 * same CSS radius scaling — keep the clamp explicit for h→0 edge cases. */
function fillSvgRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rx: number,
  color: string,
): void {
  if (w <= 0 || h <= 0) return;
  const r = Math.min(rx, w / 2, h / 2);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

// ─── Per-frame inputs bound by the orchestrator ──────────────────────────────

export interface VisualizerFrameData {
  preset: VisualizerPreset;
  frequencyData: ArrayLike<number>;
  /** Full decoded PCM channel (waveform-progress downsamplePeaks). */
  channel: Float32Array | null;
  audioBpm: number;
  overallEnergy: number;
  /** Composition frame + fps (wave offset timing). */
  frame: number;
  fps: number;
  /** Composition durationInFrames (waveform playhead progress). */
  durationInFrames: number;
}

/** Slot styling mirrors StandardVisualizerSlot's optional props (:51–58). */
export interface VisualizerSlotStyle {
  lineThickness?: number;
  gapSize?: number;
  roundness?: number;
  innerRadiusRatio?: number;
  waveLineThickness?: number;
  waveLines?: number;
  waveLineGap?: number;
  waveSections?: number;
}

export interface VisualizerSlot {
  left: number;
  top: number;
  width: number;
  height: number;
  /** Theme accent colour (StandardVisualizerSlot's accentColor prop). */
  accentColor: string;
  /** CSS opacity on the slot container (theme.visualizerOpacity etc.). */
  opacity?: number;
  style?: VisualizerSlotStyle;
}

/** StandardVisualizerSlot (:63–137) as one canvas draw. */
export function drawStandardVisualizer(
  ctx: CanvasRenderingContext2D,
  data: VisualizerFrameData,
  slot: VisualizerSlot,
): void {
  const { preset } = data;
  if (preset === 'none' || preset === 'emotion-tiktok-cut') return;
  const width = slot.width;
  const height = slot.height;
  if (!(width > 0) || !(height > 0)) return;

  ctx.save();
  ctx.globalAlpha *= slot.opacity ?? 1;
  ctx.translate(slot.left, slot.top);

  if (preset === 'waveform-progress') {
    // SVG viewport = width×height.
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();
    drawWaveform(ctx, data, width, height, slot);
  } else if (preset === 'bars') {
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();
    drawBars(ctx, data, width, height, slot);
  } else if (preset === 'radial-bars') {
    drawRadialBars(ctx, data, width, height, slot);
  } else if (preset === 'hills') {
    // HillsVisualization — deferred (not in the Phase 1.6 brief).
  } else if (preset === 'wave') {
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();
    drawWave(ctx, data, width, height, slot);
  }
  ctx.restore();
}

// ─── bars ────────────────────────────────────────────────────────────────────

function drawBars(
  ctx: CanvasRenderingContext2D,
  data: VisualizerFrameData,
  width: number,
  height: number,
  slot: VisualizerSlot,
): void {
  const style = slot.style ?? {};
  const lineThickness = style.lineThickness ?? 10;
  const gapSize = style.gapSize ?? 8;
  const roundness = style.roundness ?? 5;
  const color = slot.accentColor;
  const overallEnergy = data.overallEnergy;
  const responsiveness = 1.2;

  const bars = getBars({
    totalWidth: width,
    itemWidth: lineThickness + gapSize,
    frequencyData: data.frequencyData,
  });
  const energyAmplitudeMultiplier = 0.5 + overallEnergy * 1.1;
  const amplitudes = bars.map((v) => {
    const boostedValue = Math.pow(v, 1 / responsiveness) * responsiveness;
    return Math.min(1.5, boostedValue * energyAmplitudeMultiplier);
  });

  amplitudes.forEach((v, i) => {
    const barHeight = v * height;
    const x = i * (lineThickness + gapSize);
    const y = 0.5 * (height - barHeight);
    fillSvgRect(ctx, x, y, lineThickness, barHeight, roundness, color);
  });
}

// ─── radial-bars ─────────────────────────────────────────────────────────────

function drawRadialBars(
  ctx: CanvasRenderingContext2D,
  data: VisualizerFrameData,
  width: number,
  height: number,
  slot: VisualizerSlot,
): void {
  const style = slot.style ?? {};
  const lineThickness = style.lineThickness ?? 8;
  const roundness = style.roundness ?? 4;
  const color = slot.accentColor;
  const gapSize = style.gapSize ?? 4;
  // StandardVisualizerSlot:94–103 — diameter = min(width, height), innerRadius
  // = diameter × innerRadiusRatio. The svg viewport is diameter×diameter,
  // top-left aligned inside the slot's div.
  const diameter = Math.min(width, height);
  const innerRadius = diameter * (style.innerRadiusRatio ?? 0.15);
  const radius = 0.5 * diameter;

  const safeFrequencyData =
    !data.frequencyData || data.frequencyData.length === 0
      ? new Array(128).fill(0)
      : data.frequencyData;

  const bars = getBars({
    totalWidth: 2 * Math.PI * innerRadius,
    itemWidth: lineThickness + gapSize,
    frequencyData: safeFrequencyData,
  });
  const highpass = bars.slice(Math.floor(0.5 * bars.length));
  const amplitudes = [...highpass, ...highpass.slice().reverse()];

  const displayValues =
    amplitudes.length === 0 ? new Array(64).fill(0.1) : amplitudes.map((v) => Math.max(v, 0.15));

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, diameter, diameter);
  ctx.clip();
  displayValues.forEach((v, i) => {
    const barHeight = v * (radius - innerRadius);
    ctx.save();
    ctx.translate(radius, radius);
    ctx.rotate(((360 * i) / displayValues.length) * (Math.PI / 180));
    fillSvgRect(ctx, 0, -innerRadius - barHeight, lineThickness, barHeight, roundness, color);
    ctx.restore();
  });
  ctx.restore();
}

// ─── wave ────────────────────────────────────────────────────────────────────

function waveCubic(t: number): number {
  // remotion Easing.cubic is the plain cubic power curve t³ (see timing.ts).
  return t * t * t;
}

function makeWavePoints({
  numberOfPoints,
  amplitude,
  offsetPixels,
  width,
}: {
  numberOfPoints: number;
  amplitude: number;
  offsetPixels: number;
  width: number;
}): { x: number; y: number }[] {
  const step = 1 / numberOfPoints;
  const stepOffset = offsetPixels / width;

  return Array.from({ length: numberOfPoints })
    .map((_, i, arr) => {
      const fraction = ((i - 0.5) % arr.length) * step - stepOffset;

      let x = (fraction + 1) % 1;
      x = x * width;

      let y = Math.sin(Math.abs(fraction) * Math.PI);
      y = waveCubic(y);
      y = y * amplitude;
      y = y * Math.sin((0.5 + i) * Math.PI);

      return { x, y };
    })
    .sort((a, b) => (a.x > b.x ? 1 : -1));
}

function drawWave(
  ctx: CanvasRenderingContext2D,
  data: VisualizerFrameData,
  width: number,
  height: number,
  slot: VisualizerSlot,
): void {
  const style = slot.style ?? {};
  const sections = style.waveSections ?? 12;
  const lines = style.waveLines ?? 3;
  const lineGap = style.waveLineGap ?? 20;
  const lineThickness = style.waveLineThickness ?? 2;
  const topRoundness = 0.4;
  const bottomRoundness = 0.4;
  const lineColor = slot.accentColor;
  const offsetPixelSpeed = -150;

  const safeFrequencyData =
    !data.frequencyData || data.frequencyData.length === 0
      ? new Array(128).fill(0)
      : data.frequencyData;

  const amplitudes = Array.from(safeFrequencyData as ArrayLike<number>)
    .slice(0, 0.25 * safeFrequencyData.length)
    .map((v: number) => processAudioValue(v));

  let rms = 0;
  for (let i = 0; i < amplitudes.length; i++) rms += amplitudes[i] * amplitudes[i];
  const rmsValue = Math.sqrt(rms / amplitudes.length);

  const bpmSpeedMultiplier = Math.max(0.5, Math.min(1.5, data.audioBpm / 120));
  const dynamicOffsetPixelSpeed = offsetPixelSpeed * bpmSpeedMultiplier;
  const energyAmplitudeMultiplier = 0.6 + data.overallEnergy * 0.8;
  const amplitude = height * rmsValue * energyAmplitudeMultiplier;
  const currentTime = data.frame / data.fps;

  const nPoints = sections;
  const off = (dynamicOffsetPixelSpeed * currentTime) % ((2 * width) / sections);

  const linePoints = Array.from({ length: lines }).map((_, i) => {
    const lineShift = i * lineGap;
    return makeWavePoints({
      width,
      numberOfPoints: nPoints,
      offsetPixels: lineShift + off,
      amplitude: 0.5 * amplitude,
    });
  });

  const sectionWidth = width / nPoints;
  const topControlPointDistance = topRoundness * sectionWidth;
  const bottomControlPointDistance = bottomRoundness * sectionWidth;

  // SVG viewBox `0 -${0.5*height} ${width} ${height}` — path y=0 maps to the
  // vertical centre of the slot.
  ctx.save();
  ctx.translate(0, height / 2);
  ctx.lineWidth = lineThickness;
  ctx.strokeStyle = lineColor;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  for (const line of linePoints) {
    const calcPt = (p: { x: number; y: number }, prevP: { x: number; y: number }) => {
      const isBottomPoint = p.y <= 0;
      const currPointControlDistance = isBottomPoint
        ? topControlPointDistance
        : bottomControlPointDistance;
      const prevPointControlDistance = isBottomPoint
        ? bottomControlPointDistance
        : topControlPointDistance;
      const cp1x = prevP.x + prevPointControlDistance;
      const cp1y = prevP.y;
      const cp2x = p.x - currPointControlDistance;
      const cp2y = p.y;
      return [cp1x, cp1y, cp2x, cp2y, p.x, p.y] as const;
    };

    ctx.beginPath();
    ctx.moveTo(0, 0);
    line.forEach((p, i, pts) => {
      const prevP = i === 0 ? { x: 0, y: 0 } : pts[i - 1];
      const [a, b, c, d, e, f] = calcPt(p, prevP);
      ctx.bezierCurveTo(a, b, c, d, e, f);
    });
    const lastP = line[line.length - 1];
    const [a, b, c, d, e, f] = calcPt({ x: width, y: 0 }, lastP);
    ctx.bezierCurveTo(a, b, c, d, e, f);
    ctx.stroke();
  }
  ctx.restore();
}

// ─── waveform-progress ───────────────────────────────────────────────────────

function downsamplePeaks(channel: Float32Array, numBars: number): number[] {
  if (!channel || channel.length === 0) return [];
  const samplesPerBar = Math.max(1, Math.floor(channel.length / numBars));
  const peaks: number[] = [];
  for (let i = 0; i < numBars; i++) {
    let max = 0;
    const start = i * samplesPerBar;
    const end = Math.min(start + samplesPerBar, channel.length);
    for (let j = start; j < end; j++) {
      const abs = Math.abs(channel[j]);
      if (abs > max) max = abs;
    }
    peaks.push(max);
  }
  return peaks;
}

function frequencyPeaks(frequencyData: ArrayLike<number>, numBars: number): number[] {
  if (!frequencyData.length) return [];
  return Array.from({ length: numBars }, (_, i) => {
    const t = i / Math.max(1, numBars - 1);
    const idx = Math.min(frequencyData.length - 1, Math.floor(t * (frequencyData.length - 1)));
    return frequencyData[idx] ?? 0;
  });
}

/** Catmull-Rom → cubic bezier closed waveform path (verbatim math). */
function buildClosedWaveformPath(
  ctx: CanvasRenderingContext2D,
  peaks: number[],
  width: number,
  height: number,
  tension: number,
  amplitudeScale = 1,
): void {
  const cy = height / 2;
  const maxAmp = cy * 0.88 * Math.max(0.2, Math.min(2, amplitudeScale));

  const maxPeak = Math.max(...peaks, 1e-4);
  const norm = peaks.map((p) => p / maxPeak);

  const top: { x: number; y: number }[] = norm.map((p, i) => ({
    x: (i / (norm.length - 1)) * width,
    y: cy - p * maxAmp,
  }));
  const bottom: { x: number; y: number }[] = [...norm].reverse().map((p, i, arr) => ({
    x: ((arr.length - 1 - i) / (arr.length - 1)) * width,
    y: cy + norm[arr.length - 1 - i] * maxAmp,
  }));

  const catmullToBezier = (pts: { x: number; y: number }[], startCommand: 'M' | 'L') => {
    if (startCommand === 'M') ctx.moveTo(pts[0].x, pts[0].y);
    else ctx.lineTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 2] ?? pts[i - 1];
      const p1 = pts[i - 1];
      const p2 = pts[i];
      const p3 = pts[i + 1] ?? pts[i];
      const cp1x = p1.x + ((p2.x - p0.x) * tension) / 3;
      const cp1y = p1.y + ((p2.y - p0.y) * tension) / 3;
      const cp2x = p2.x - ((p3.x - p1.x) * tension) / 3;
      const cp2y = p2.y - ((p3.y - p1.y) * tension) / 3;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
  };

  catmullToBezier(top, 'M');
  catmullToBezier(bottom, 'L');
  ctx.closePath();
}

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  data: VisualizerFrameData,
  width: number,
  height: number,
  slot: VisualizerSlot,
): void {
  const accentColor = slot.accentColor;
  // StandardVisualizerSlot:65–73 — dim unplayed = accentColor33, numBars 200.
  const waveColor = `${accentColor}33`;
  const progressColor = accentColor;
  const numBars = 200;
  const tension = 1;

  const liveEnergy = data.frequencyData.length
    ? Array.from(data.frequencyData as ArrayLike<number>).reduce((sum: number, v: number) => sum + v, 0) / data.frequencyData.length
    : 0;

  let peaks: number[] = [];
  if (data.channel) {
    const raw = downsamplePeaks(data.channel, numBars);
    if (raw.length > 0) peaks = raw;
  }
  if (peaks.length === 0) peaks = frequencyPeaks(data.frequencyData, numBars);

  const progress = data.durationInFrames > 0 ? data.frame / data.durationInFrames : 0;
  const progressX = progress * width;

  if (peaks.length === 0) {
    // Loading placeholder — flat centre line.
    ctx.strokeStyle = waveColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  } else {
    const amplitudeScale = 0.85 + liveEnergy * 0.35;
    // Unplayed (dim) — right of the playhead.
    ctx.save();
    ctx.beginPath();
    ctx.rect(progressX, 0, width - progressX, height);
    ctx.clip();
    ctx.fillStyle = waveColor;
    ctx.beginPath();
    buildClosedWaveformPath(ctx, peaks, width, height, tension, amplitudeScale);
    ctx.fill();
    ctx.restore();
    // Played (bright) — left of the playhead.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, progressX, height);
    ctx.clip();
    ctx.fillStyle = progressColor;
    ctx.beginPath();
    buildClosedWaveformPath(ctx, peaks, width, height, tension, amplitudeScale);
    ctx.fill();
    ctx.restore();
  }

  // Playhead cursor.
  if (progressX > 0 && progressX < width) {
    ctx.save();
    ctx.globalAlpha *= 0.8;
    ctx.strokeStyle = progressColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(progressX, 0);
    ctx.lineTo(progressX, height);
    ctx.stroke();
    ctx.restore();
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export type VisualizerFrameFn = ((
  ctx: CanvasRenderingContext2D,
  slot: VisualizerSlot,
  frame: number,
) => void) & {
  /** Releases the WebGL context held by WebGL presets. */
  dispose?: () => void;
};

/** Binds the frame-context statics; the orchestrator binds frame per frame.
 *  `channel` is the full decoded PCM channel (waveform-progress peaks) — the
 *  same buffer useAudioData hands the composition. WebGL presets
 *  (visualizers-gl.ts) render through a private WebGL2 canvas and fall back to
 *  their Canvas2D classicBase when WebGL2 is unavailable. */
export function createVisualizerRenderer(
  fctx: FrameContext,
  channel: Float32Array | null,
): VisualizerFrameFn {
  const preset = fctx.preset;
  const audioBpm = fctx.props.audioBpm ?? 120;
  const drawClassic = (
    ctx: CanvasRenderingContext2D,
    slot: VisualizerSlot,
    frame: number,
    classicPreset: VisualizerPreset,
  ) => {
    const a = fctx.frameArgs(frame);
    drawStandardVisualizer(
      ctx,
      {
        preset: classicPreset,
        frequencyData: a.frequencyData,
        channel,
        audioBpm,
        overallEnergy: a.overallEnergy,
        frame,
        fps: fctx.fps,
        durationInFrames: fctx.durationInFrames,
      },
      slot,
    );
  };

  if (!isWebGLVisualizerPreset(preset)) {
    return (ctx, slot, frame) => drawClassic(ctx, slot, frame, preset);
  }

  const fallback = classicVisualizerPreset(preset);
  const inputsAt = createGlFrameInputs({
    frequencyData: fctx.analysis.frequencyData,
    totalFrames: fctx.analysis.totalFrames,
    fps: fctx.fps,
    durationInFrames: fctx.durationInFrames,
    channel,
  });
  let gl: GlVisualizerRenderer | null | undefined;

  const draw: VisualizerFrameFn = (ctx, slot, frame) => {
    if (!(slot.width > 0) || !(slot.height > 0)) return;
    if (gl === undefined) gl = GlVisualizerRenderer.create();
    // Render at device resolution: the overlay ctx may be scaled/mirrored.
    const m = ctx.getTransform();
    const sx = Math.hypot(m.a, m.b) || 1;
    const sy = Math.hypot(m.c, m.d) || 1;
    const bleed: (typeof GL_SLOT_BLEED)[GlVisualizerPreset] & object =
      GL_SLOT_BLEED[preset as GlVisualizerPreset] ?? { x: 1, y: 1 };
    const w = slot.width * bleed.x;
    const h =
      bleed.maxHOverW !== undefined
        ? Math.max(slot.height, Math.min(slot.height * bleed.y, w * bleed.maxHOverW))
        : slot.height * bleed.y;
    const left = slot.left - (w - slot.width) / 2;
    const top = slot.top - (h - slot.height) / 2;
    const rendered = gl?.render(
      preset as GlVisualizerPreset,
      inputsAt(frame),
      w * sx,
      h * sy,
      slot.accentColor,
    );
    if (!gl || !rendered) {
      drawClassic(ctx, slot, frame, fallback);
      return;
    }
    ctx.save();
    ctx.globalAlpha *= slot.opacity ?? 1;
    gl.blit(ctx, rendered, left, top, w, h);
    ctx.restore();
  };
  draw.dispose = () => {
    gl?.dispose();
    gl = null;
  };
  return draw;
}
