import React, { useEffect, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import {
  FILM_DUST_PER_FRAME,
  FILM_DUST_STDDEV,
  FILM_OVERLAY_FPS,
  FILM_STREAK_ALPHA_RANGE,
  FILM_STREAK_GAP_S,
  FILM_STREAK_MAX,
  FILM_STREAK_VISIBLE_S,
  FILM_STREAK_WIDTH_CHOICES,
  FPS,
  VIDEO_H,
  VIDEO_W,
} from '../constants';

// Mulberry32 — small deterministic PRNG so the same overlayFrameIndex /
// cycle index always produces the same dust + streak pattern. This gives us
// frame-to-frame stability inside a single overlay frame and reproducible
// renders across machines.
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, lo: number, hi: number): number {
  return Math.floor(rng() * (hi - lo + 1)) + lo;
}

function randRange(rng: () => number, lo: number, hi: number): number {
  return rng() * (hi - lo) + lo;
}

// Box-Muller normal distribution to mimic Python's random.gauss(mean, std).
function randGauss(rng: () => number, mean: number, std: number): number {
  const u1 = Math.max(rng(), 1e-9);
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * std;
}

interface DrawOptions {
  overlayFrameIndex: number;
  baseSeed: number;
}

function drawOverlayFrame(ctx: CanvasRenderingContext2D, opts: DrawOptions) {
  const { overlayFrameIndex, baseSeed } = opts;
  const width = VIDEO_W;
  const height = VIDEO_H;

  ctx.clearRect(0, 0, width, height);

  // === Streak cycle ===
  // Visible window of FILM_STREAK_VISIBLE_S, then dark window of FILM_STREAK_GAP_S.
  // Streak layout is rolled fresh at the start of every visible window so it
  // changes between appearances.
  const visibleFrames = Math.max(1, Math.round(FILM_OVERLAY_FPS * FILM_STREAK_VISIBLE_S));
  const gapFrames = Math.max(0, Math.round(FILM_OVERLAY_FPS * FILM_STREAK_GAP_S));
  const cycleFrames = Math.max(1, visibleFrames + gapFrames);
  const cyclePos = overlayFrameIndex % cycleFrames;
  const cycleStart = overlayFrameIndex - cyclePos;
  const inVisible = cyclePos < visibleFrames;

  if (inVisible) {
    // Seed the streak set from the cycle start so it stays stable across the
    // visible window — the Python loop rolls once per cycle and reuses it.
    const streakRng = makeRng(baseSeed ^ (cycleStart * 0x9e3779b1));
    const streakCount = randInt(streakRng, 1, Math.max(1, FILM_STREAK_MAX));
    const [aLo, aHi] = FILM_STREAK_ALPHA_RANGE;
    for (let i = 0; i < streakCount; i++) {
      const sx = randInt(streakRng, 0, width - 1);
      const sw = FILM_STREAK_WIDTH_CHOICES[randInt(streakRng, 0, FILM_STREAK_WIDTH_CHOICES.length - 1)];
      const alpha = randRange(streakRng, aLo, aHi);
      const tint = randInt(streakRng, 225, 255);
      const x0 = sx - Math.floor(sw / 2);
      ctx.fillStyle = `rgba(${tint}, ${tint}, ${tint}, ${alpha.toFixed(4)})`;
      ctx.fillRect(x0, 0, sw, height);
    }
  }

  // === Dust specks ===
  // Fresh per overlay frame so they shimmer like real grain.
  const dustRng = makeRng(baseSeed ^ ((overlayFrameIndex + 1) * 0x85ebca6b));
  const dustCount = Math.max(0, Math.round(randGauss(dustRng, FILM_DUST_PER_FRAME, FILM_DUST_STDDEV)));
  for (let i = 0; i < dustCount; i++) {
    const cx = randInt(dustRng, 0, width - 1);
    const cy = randInt(dustRng, 0, height - 1);

    const roll = dustRng();
    let baseR: number;
    if (roll < 0.75) {
      // Small specks dominate again.
      baseR = randInt(dustRng, 1, 2);
    } else if (roll < 0.95) {
      // Occasional mid flecks.
      baseR = randInt(dustRng, 2, 4);
    } else {
      // Rare chunky crackle.
      baseR = randInt(dustRng, 4, 7);
    }

    const tint = randInt(dustRng, 210, 255);
    const alpha = randInt(dustRng, 60, 160) / 255;
    ctx.fillStyle = `rgba(${tint}, ${tint}, ${tint}, ${alpha.toFixed(4)})`;

    if (baseR <= 1) {
      ctx.fillRect(cx, cy, 1, 1);
      continue;
    }

    const numVerts = randInt(dustRng, 5, 9);
    ctx.beginPath();
    for (let v = 0; v < numVerts; v++) {
      const angle = (v / numVerts) * 2 * Math.PI + randRange(dustRng, -0.4, 0.4);
      const r = baseR * randRange(dustRng, 0.55, 1.25);
      const px = Math.round(cx + r * Math.cos(angle));
      const py = Math.round(cy + r * Math.sin(angle));
      if (v === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
}

interface FilmOverlayLayerProps {
  /**
   * Per-render seed. Pass a stable number per video so the same render always
   * produces the same noise field. Defaults to a fixed value so previews are
   * deterministic.
   */
  seed?: number;
}

export const FilmOverlayLayer: React.FC<FilmOverlayLayerProps> = ({ seed = 1 }) => {
  const frame = useCurrentFrame();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Map the timeline frame onto an FPS=4 overlay frame, then loop within
  // FILM_OVERLAY_FRAMES so it ties back into the streak cycle math.
  const framesPerOverlay = Math.max(1, Math.round(FPS / FILM_OVERLAY_FPS));
  const overlayFrameIndex = Math.floor(frame / framesPerOverlay);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawOverlayFrame(ctx, { overlayFrameIndex, baseSeed: seed });
  }, [overlayFrameIndex, seed]);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <canvas
        ref={canvasRef}
        width={VIDEO_W}
        height={VIDEO_H}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          // Screen blend so the bright dust/streaks add light over the
          // background without darkening it.
          mixBlendMode: 'screen',
        }}
      />
    </AbsoluteFill>
  );
};
