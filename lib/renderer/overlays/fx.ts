/**
 * lib/renderer/overlays/fx.ts — Canvas2D film-grain + vignette helpers,
 * copied from roughclip lib/renderer/overlays/fx.ts (roughclip's
 * TikTok-specific effect resolution stripped — wavecanvas resolves overlay
 * ids through constants/overlays.ts in Phase 1):
 *
 *   grain    — per-pixel hash-PRNG film grain, frame-seeded, rendered at
 *              reduced resolution (SIM_SCALE) and bilinear-upscaled.
 *   vignette — radial edge darkening matching the CSS radial-gradient of
 *              the DOM overlay it replaces.
 *
 * All are deterministic in `frame` — no wall clock, no React, no remotion.
 */

// ─── Vignette ────────────────────────────────────────────────────────────────

export function drawVignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity = 0.55,
  feather = 0.75,
  tint = 'rgba(0,0,0,1)',
): void {
  // radial-gradient(ellipse at center, transparent 0%, transparent
  // (1-feather)*100%, tint (100 - feather*35)%). CSS sizes the ellipse to the
  // farthest corner — emulate by drawing a circle under a non-uniform scale.
  const diag = Math.hypot(width, height);
  const radius = diag / 2;
  const cx = width / 2;
  const cy = height / 2;
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  const transparentUntil = (1 - feather) * 100;
  const tintAt = 100 - feather * 35;
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(transparentUntil / 100, 'rgba(0,0,0,0)');
  g.addColorStop(tintAt / 100, tint);
  g.addColorStop(1, tint);
  ctx.save();
  ctx.globalAlpha = intensity;
  // Unit circle → ellipse reaching the corners: rx = width/√2, ry = height/√2.
  ctx.translate(cx, cy);
  ctx.scale((width * Math.SQRT2) / diag, (height * Math.SQRT2) / diag);
  ctx.fillStyle = g;
  ctx.fillRect(-cx * 2, -cy * 2, width * 2, height * 2);
  ctx.restore();
}

// ─── Film grain ──────────────────────────────────────────────────────────────

const SIM_SCALE = 0.28;
const GRAIN_GATE = 2.65;
const SCAN_PERSISTENT_COUNT = 2;
const SCAN_FLASH_COUNT = 1;
const SCAN_MAX_ALPHA = 38;
const SCAN_WIDTH = 1;

function hash(n: number): number {
  let x = n >>> 0;
  x = ((x >>> 16) ^ x) * 0x45d9f3b;
  x = ((x >>> 16) ^ x) * 0x45d9f3b;
  x = (x >>> 16) ^ x;
  return (x >>> 0) / 0xffffffff;
}

function pixelU1(x: number, y: number, ch: number, frameSeed: number): number {
  return hash(x * 1973 + y * 9277 + ch * 26699 + frameSeed * 49243);
}
function pixelU2(x: number, y: number, ch: number, frameSeed: number): number {
  return hash(x * 3761 + y * 7919 + ch * 31397 + frameSeed * 73856 + 12345);
}
function boxMuller(u1: number, u2: number): number {
  const safe = Math.max(u1, 1e-10);
  return Math.sqrt(-2 * Math.log(safe)) * Math.cos(2 * Math.PI * u2);
}
function flickerMultiplier(frame: number): number {
  const slot = Math.floor(frame / 3);
  const r = hash(slot * 7919 + 3571);
  if (r > 0.88) {
    const age = frame % 3;
    if (age < 2) return 1.3 + r * 0.25;
  }
  return 1.0;
}

let grainCanvas: HTMLCanvasElement | null = null;

/**
 * Draw the film-grain layer. `rms` is the audio RMS (0..~1) used to modulate
 * sigma/opacity in the DOM original; pass 0 when no audio analysis is wired.
 */
export function drawGrain(
  ctx: CanvasRenderingContext2D,
  frame: number,
  width: number,
  height: number,
  rms = 0,
  baseIntensity = 1.0,
): void {
  const sigma = 8 + rms * 6;
  const opacity = Math.min(baseIntensity * 8 + rms * 0.10, 0.82);

  const W = Math.max(1, Math.round(width * SIM_SCALE));
  const H = Math.max(1, Math.round(height * SIM_SCALE));

  if (!grainCanvas) grainCanvas = document.createElement('canvas');
  grainCanvas.width = W;
  grainCanvas.height = H;
  const g = grainCanvas.getContext('2d');
  if (!g) return;
  const imageData = g.createImageData(W, H);
  const d = imageData.data;

  const effectiveSigma = sigma * flickerMultiplier(frame);
  const fs = frame;
  const densityJitter = 0.55 + hash(frame * 8191 + 1234) * 0.9;
  const lf = 0.55 + 1.8 * 0.5 * 0.5; // luminanceFactor(0.5)

  const writePixel = (px: number, py: number, rV: number, gV: number, bV: number, a: number) => {
    if (px < 0 || px >= W || py < 0 || py >= H) return;
    const i = (py * W + px) * 4;
    if (d[i + 3] === 0) {
      d[i] = rV;
      d[i + 1] = gV;
      d[i + 2] = bV;
    }
    d[i + 3] = Math.min(255, d[i + 3] + a);
  };

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const gv = boxMuller(pixelU1(x, y, 0, fs), pixelU2(x, y, 0, fs)) * effectiveSigma * lf;
      if (Math.abs(gv) < GRAIN_GATE * effectiveSigma) continue;

      const colorRoll = hash(x * 4127 + y * 7523 + fs * 3313);
      let rV: number, gV: number, bV: number;
      if (gv > 0) {
        if (colorRoll < 0.083) {
          rV = 255; gV = 255; bV = 255;
        } else if (colorRoll < 0.5) {
          rV = 255; gV = 238; bV = 190;
        } else if (colorRoll < 0.78) {
          rV = 205; gV = 225; bV = 255;
        } else {
          rV = 220; gV = 220; bV = 228;
        }
      } else {
        const dR = boxMuller(pixelU1(x, y, 1, fs), pixelU2(x, y, 1, fs)) * 0.35;
        const dB = boxMuller(pixelU1(x, y, 2, fs), pixelU2(x, y, 2, fs)) * 0.35;
        rV = Math.max(0, Math.round(10 * (1 + dR * 0.1)));
        gV = 6;
        bV = Math.max(0, Math.round(18 * (1 + dB * 0.1)));
      }

      const tierRoll = hash(x * 5003 + y * 6833 + fs * 1201);
      const brightRoll = hash(x * 6271 + y * 8191 + fs * 4561 + 9999);
      const dj = densityJitter;

      if (tierRoll < 0.6) {
        const a = Math.max(12, Math.round((12 + brightRoll * 22) * dj));
        writePixel(x, y, rV, gV, bV, a);
      } else if (tierRoll < 0.88) {
        const a = Math.max(28, Math.round((28 + brightRoll * 35) * dj));
        writePixel(x, y, rV, gV, bV, a);
      } else if (tierRoll < 0.99) {
        const a = Math.max(20, Math.round((20 + brightRoll * 28) * dj));
        const aEdge = Math.round(a * 0.25);
        const aCorner = Math.round(a * 0.08);
        writePixel(x, y, rV, gV, bV, a);
        writePixel(x + 1, y, rV, gV, bV, aEdge);
        writePixel(x, y + 1, rV, gV, bV, aEdge);
        writePixel(x + 1, y + 1, rV, gV, bV, aCorner);
      } else {
        const a = Math.max(180, Math.round((180 + brightRoll * 75) * dj));
        writePixel(x, y, 255, 255, 255, Math.min(255, a));
      }
    }
  }

  // Scan lines: persistent slow-drifting + occasional single-frame flashes.
  const driftSlot = Math.floor(frame / 32);
  for (let s = 0; s < SCAN_PERSISTENT_COUNT; s++) {
    const xPos = Math.floor(hash(driftSlot * 1337 + s * 479) * W);
    const alpha = Math.round((0.4 + hash(driftSlot * 9431 + s * 211) * 0.6) * SCAN_MAX_ALPHA);
    const warm = hash(driftSlot * 3571 + s * 97) > 0.5;
    for (let y = 0; y < H; y++) {
      for (let dx = 0; dx < SCAN_WIDTH; dx++) {
        const px = Math.min(W - 1, xPos + dx);
        const i = (y * W + px) * 4;
        d[i] = warm ? 255 : 200;
        d[i + 1] = 240;
        d[i + 2] = warm ? 200 : 255;
        d[i + 3] = Math.min(255, d[i + 3] + alpha);
      }
    }
  }
  for (let s = 0; s < SCAN_FLASH_COUNT; s++) {
    if (hash(frame * 6271 + s * 853) > 0.1) continue;
    const xPos = Math.floor(hash(frame * 4157 + s * 631) * W);
    const alpha = Math.round((0.3 + hash(frame * 7919 + s * 401) * 0.5) * SCAN_MAX_ALPHA);
    for (let y = 0; y < H; y++) {
      const i = (y * W + xPos) * 4;
      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
      d[i + 3] = Math.min(255, d[i + 3] + alpha);
    }
  }

  g.putImageData(imageData, 0, 0);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.imageSmoothingEnabled = true; // bilinear upscale softens the grain
  ctx.imageSmoothingQuality = 'medium'; // DOM <img imageRendering:'auto'> == bilinear
  ctx.drawImage(grainCanvas, 0, 0, width, height);
  ctx.restore();
}

/** Debug/parity access to the grain sim canvas (drawGrain rebuilds it per call). */
export function debugGrainCanvas(): HTMLCanvasElement | null {
  return grainCanvas;
}

// ─── Sparkles (BokehLensFlare.tsx) ───────────────────────────────────────────

/**
 * Lens-flare bokeh — 25 index-seeded particles in a wind system, audio-reactive
 * size/opacity plus a beat light-leak. Verbatim math; the SVG radial gradient
 * (accent → transparent at 70%) maps to createRadialGradient.
 */
export function drawSparkles(
  ctx: CanvasRenderingContext2D,
  frame: number,
  width: number,
  height: number,
  frequencyData: ArrayLike<number>,
  accentColor = '#4ECDC4',
  isPodcast = false,
): void {
  if (isPodcast) return;

  const bassRange = Math.floor(frequencyData.length * 0.15);
  const midStart = Math.floor(frequencyData.length * 0.15);
  const midEnd = Math.floor(frequencyData.length * 0.5);
  const trebleStart = Math.floor(frequencyData.length * 0.8);

  const bassAmplitude =
    Array.from(frequencyData as ArrayLike<number>).slice(0, bassRange).reduce((sum: number, val: number) => sum + val, 0) / bassRange;
  const midAmplitude =
    Array.from(frequencyData as ArrayLike<number>).slice(midStart, midEnd).reduce((sum: number, val: number) => sum + val, 0) / (midEnd - midStart);
  const trebleAmplitude =
    Array.from(frequencyData as ArrayLike<number>).slice(trebleStart).reduce((sum: number, val: number) => sum + val, 0) / (frequencyData.length - trebleStart);
  const overall = (bassAmplitude + midAmplitude + trebleAmplitude) / 3;

  const windDirectionCycle = 180;
  const windStrengthCycle = 300;
  const windDirectionPhase = ((frame % windDirectionCycle) / windDirectionCycle) * Math.PI * 2;
  const windDirection = Math.sin(windDirectionPhase);
  const windStrengthPhase = ((frame % windStrengthCycle) / windStrengthCycle) * Math.PI * 2;
  const baseWindStrength = 1.25 + Math.sin(windStrengthPhase) * 0.75;
  const audioWindBoost = bassAmplitude * 0.8;

  for (let i = 0; i < 25; i++) {
    const baseX = 10 + (i * 3.7) % 80;
    const fallSpeed = 1.0 + (i % 7) * 0.3;
    const baseSize = 30 + (i % 4) * 20;
    const amplitude = i % 3 === 0 ? bassAmplitude : i % 3 === 1 ? midAmplitude : trebleAmplitude;
    const phaseOffset = i * 15;
    const amplitudeX = 0.7 + (i % 3) * 0.15;

    const particleFrame = frame + phaseOffset;
    const fallDistance = (particleFrame * fallSpeed) % (height + baseSize * 2);
    const y = fallDistance - baseSize;

    const windStrength = (baseWindStrength + audioWindBoost) * amplitudeX;
    const windDisplacement = windDirection * windStrength * 80;
    const driftPhase = (particleFrame * 0.02) % (Math.PI * 2);
    const particleDrift = Math.sin(driftPhase) * 20;

    const x = (width / 100) * baseX + windDisplacement + particleDrift;

    const size = baseSize + amplitude * 40;
    const radius = size / 2;

    // interpolate(overall, [0, 0.8], [0.15, 0.4], clamp)
    const opacity = Math.max(0.15, Math.min(0.4, 0.15 + (overall / 0.8) * 0.25));

    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, accentColor);
    g.addColorStop(0.7, `${accentColor}00`);
    g.addColorStop(1, `${accentColor}00`);
    ctx.save();
    ctx.globalAlpha *= opacity;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Light leak on strong beats.
  if (overall > 0.6) {
    const cx = (30 + bassAmplitude * 20) * 0.01 * width;
    const cy = (40 + midAmplitude * 20) * 0.01 * height;
    const rx = Math.SQRT2 * Math.max(cx, width - cx);
    const ry = Math.SQRT2 * Math.max(cy, height - cy);
    ctx.save();
    ctx.globalAlpha *= (overall - 0.6) * 0.4;
    ctx.translate(cx, cy);
    ctx.scale(rx, ry);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, `${accentColor}1A`);
    g.addColorStop(0.55, `${accentColor}00`);
    g.addColorStop(1, `${accentColor}00`);
    ctx.fillStyle = g;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }
}

// ─── Dust (DustOverlay.tsx) ──────────────────────────────────────────────────

/** Deterministic pseudo-random generator from a seed (DustOverlay.tsx:22–25). */
function dustPrng(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

interface DustParticle {
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  size: number;
  opacityBase: number;
  phase: number;
  drift: number;
  speed: number;
}

function buildDustParticles(count: number, width: number, height: number): DustParticle[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = i + 1;
    const vx = (dustPrng(seed * 3 + 1) - 0.5) * 6;
    const vy = (dustPrng(seed * 3 + 2) - 0.5) * 4 - 1;
    return {
      x0: dustPrng(seed * 3 + 3) * width,
      y0: dustPrng(seed * 3 + 4) * height,
      vx,
      vy,
      size: 2 + dustPrng(seed * 3 + 5) * 3.5,
      opacityBase: 0.35 + dustPrng(seed * 3 + 6) * 0.35,
      phase: dustPrng(seed * 3 + 7) * Math.PI * 2,
      drift: 5 + dustPrng(seed * 3 + 8) * 10,
      speed: 0.2 + dustPrng(seed * 3 + 9) * 0.5,
    };
  });
}

/** Soft floating particles. The CSS circle + box-shadow glow is drawn as a
 *  gaussian-blurred "spread" circle (diameter 3×size, shadowBlur 3×size —
 *  CSS spread grows the shadowed shape by the spread radius) under the solid
 *  core. */
export function drawDust(
  ctx: CanvasRenderingContext2D,
  frame: number,
  fps: number,
  width: number,
  height: number,
  particleCount = 70,
): void {
  const particles = buildDustParticles(particleCount, width, height);
  const t = frame / fps;

  for (const p of particles) {
    let x = p.x0 + p.vx * t + Math.sin(t * p.speed + p.phase) * p.drift;
    let y = p.y0 + p.vy * t + Math.cos(t * p.speed * 0.7 + p.phase) * p.drift;
    x = ((x % width) + width) % width;
    y = ((y % height) + height) % height;

    const opacity = Math.max(0.05, Math.min(0.7, p.opacityBase + Math.sin(t * p.speed * 2 + p.phase) * 0.12));
    const r = p.size / 2;

    // Glow: CSS `0 0 ${size*3}px ${size}px rgba(255,255,255,o*0.65)` — the
    // shadow of the circle whose radius is grown by the spread (size),
    // blurred by 3×size. A transparent fill leaves only the shadow.
    ctx.save();
    ctx.shadowColor = `rgba(255,255,255,${opacity * 0.65})`;
    ctx.shadowBlur = p.size * 3;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.beginPath();
    ctx.arc(x, y, r + p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = `rgba(255,255,255,${opacity})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── Snow ────────────────────────────────────────────────────────────────────
//
// Gentle falling snow, procedural like dust (no video file). Determinism
// matches dust exactly: a per-particle seeded sin-PRNG builds the flake
// field, and motion is a pure function of `t = frame / fps` — export frames
// are reproducible. Not audio-reactive (dust isn't either): steady fall.
//
// Visibility follows dust's approach — a white core plus a soft white glow
// (transparent fill + shadowBlur), which reads over dark backgrounds and
// mid-tones; small distant flakes stay subtle.

/** Deterministic pseudo-random generator from a seed (same family as dustPrng). */
function snowPrng(seed: number): number {
  const x = Math.sin(seed * 12482 + 76143) * 189437;
  return x - Math.floor(x);
}

interface SnowFlake {
  /** Base horizontal position (0–1 of width; sway wraps it). */
  x0: number;
  /** Phase offset so flakes are spread along the fall at frame 0. */
  y0: number;
  /** Fall speed in frame-heights per second (pre-depth scale). */
  fallSpeed: number;
  /** Horizontal sway. */
  swayAmp: number;
  swaySpeed: number;
  phase: number;
  /** Depth 0.4–1: smaller/slower/fainter in the distance. */
  depth: number;
  size: number;
}

function buildSnowFlakes(count: number): SnowFlake[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = i + 1;
    const depth = 0.4 + snowPrng(seed * 5 + 4) * 0.6;
    return {
      x0: snowPrng(seed * 5 + 1),
      y0: snowPrng(seed * 5 + 2),
      fallSpeed: 0.06 + snowPrng(seed * 5 + 3) * 0.07,
      depth,
      swayAmp: 12 + snowPrng(seed * 5 + 5) * 26 * depth,
      swaySpeed: 0.4 + snowPrng(seed * 5 + 6) * 0.7,
      phase: snowPrng(seed * 5 + 7) * Math.PI * 2,
      // Radius at 1920-reference height: ~1.4–7px (diameter ~3–14px) —
      // clearly visible flakes, not dust-sized specks.
      size: (3.4 + snowPrng(seed * 5 + 8) * 3.6) * depth,
    };
  });
}

/**
 * Falling snowflakes with horizontal sway. Velocities scale with frame
 * height (fallSpeed is in heights/sec) so the feel is constant across
 * resolutions and orientations; sway amplitude follows the same scale.
 */
export function drawSnow(
  ctx: CanvasRenderingContext2D,
  frame: number,
  fps: number,
  width: number,
  height: number,
  flakeCount = 90,
): void {
  const flakes = buildSnowFlakes(flakeCount);
  const t = frame / fps;
  const margin = 8;

  for (const f of flakes) {
    // Fall wraps over the frame height (plus margin); sway wraps horizontally.
    const fallSpan = height + margin * 2;
    const y = ((f.y0 * fallSpan + f.fallSpeed * f.depth * height * t) % fallSpan) - margin;
    const rawX = f.x0 * width + Math.sin(t * f.swaySpeed + f.phase) * f.swayAmp * (height / 1920);
    const x = ((rawX % width) + width) % width;

    // Nearer flakes are bigger, faster AND brighter; distant ones recede.
    const opacity = 0.3 + 0.55 * f.depth;
    const r = Math.max(1.4, (f.size / 2) * (height / 1920) * 2);

    // Soft glow (dust's CSS-shadow approximation), weaker than dust's —
    // snow reads as crisp flakes with a faint halo, not floating motes.
    ctx.save();
    ctx.shadowColor = `rgba(255,255,255,${opacity * 0.4})`;
    ctx.shadowBlur = f.size * 2;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.beginPath();
    ctx.arc(x, y, r + f.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = `rgba(255,255,255,${opacity})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Draw every enabled fx layer, bottom→top (grain → sparkles → dust → vignette). */export function drawFxOverlays(
  ctx: CanvasRenderingContext2D,
  frame: number,
  width: number,
  height: number,
  fx: { grain?: boolean; vignette?: boolean },
  rms = 0,
): void {
  if (fx.grain) drawGrain(ctx, frame, width, height, rms);
  if (fx.vignette) drawVignette(ctx, width, height);
}
