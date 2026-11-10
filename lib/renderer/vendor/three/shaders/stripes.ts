/**
 * stripes — hand-drawn crayon/chalk stripes on paper (Sobriety Cards).
 *
 * Original WaveCanvas shader. How it reads:
 *   - Up to MAX_STRIPES vertical bands. Each band's left/right edges follow
 *     the SAME two-sine wobble as lib/sobriety-card-art.ts (stripeEdgeOffset)
 *     so the WebGL card, the static SVG and the OG images share a layout;
 *     fbm noise on top roughens the edges into a crayon line.
 *   - Rounded half-ellipse ends (stripeCapHeight in the art module).
 *   - Crayon texture: paper-tooth grain + vertical streak noise lets specks
 *     of paper show through the wax; bands multiply where they overlap.
 *   - Motion (uMotion 0–1): bands drift/breathe a few px, grain "boils"
 *     slowly between two noise states. uMotion = 0 is a clean static frame
 *     (prefers-reduced-motion, exports).
 *   - uRipple: seconds since a soft wave ripple started (<0 = off) — the
 *     wave.ts sine ripple, swept left → right once through the stripes.
 *
 * Coordinates: P is pixel space with y DOWN (matching the art module).
 */

export const MAX_STRIPES = 9;

/** Vertex shader for three.js ShaderMaterial (plane geometry `uv`). */
export const STRIPES_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const STRIPES_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;
  #define MAX_STRIPES ${MAX_STRIPES}
  #define TAU 6.28318530718

  uniform float uTime;
  uniform float uMotion;
  uniform float uRipple;
  uniform vec2  uResolution;
  uniform float uSeed;
  uniform int   uCount;
  /** x0, x1, top, bottom — pixels. */
  uniform vec4  uBox[MAX_STRIPES];
  /** amp (px), freq, phase, lean (px). */
  uniform vec4  uWobble[MAX_STRIPES];
  uniform vec3  uColor[MAX_STRIPES];
  uniform vec3  uPaper;
  varying vec2  vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.03 + 17.1;
      a *= 0.5;
    }
    return v;
  }

  // Must match stripeEdgeOffset() in lib/sobriety-card-art.ts.
  float edgeOffset(vec4 wob, float t, float side) {
    return wob.x * (
      0.7 * sin(t * wob.y * TAU + wob.z + side * 1.7) +
      0.3 * sin(t * wob.y * 2.3 * TAU + wob.z * 1.3 + side)
    ) + wob.w * (t - 0.5);
  }

  // Crayon tooth: how much wax lands on the paper at P (0 = bare paper).
  float crayonTooth(vec2 P, float s, vec2 boil) {
    vec2 q = P / s + boil;
    float tooth = noise(q * 0.55);
    float streak = fbm(vec2(q.x * 0.09, q.y * 0.012));
    float fleck = noise(q * 1.7);
    float w = tooth * 0.45 + streak * 0.4 + fleck * 0.15;
    return smoothstep(0.18, 0.52, w);
  }

  void main() {
    float s = uResolution.x / 1000.0;
    vec2 P = vec2(vUv.x, 1.0 - vUv.y) * uResolution;

    // Soft wave ripple, swept once left → right (wave.ts sine ripple).
    if (uRipple >= 0.0) {
      float front = (uRipple / 1.9) * 1.5 - 0.25;
      float env = exp(-pow((vUv.x - front) / 0.16, 2.0));
      float fade = 1.0 - smoothstep(1.7, 2.6, uRipple);
      P.x += env * fade * sin(P.y / s * 0.022 - uRipple * 6.0) * 16.0 * s;
    }

    // Paper: warm off-white with faint fibre.
    float fibre = fbm(P / s * vec2(0.02, 0.08));
    vec3 col = uPaper * (0.975 + 0.035 * fibre);

    // Grain boil: blend between two noise states, ~0.4 Hz.
    float boilT = uTime * 0.4 * uMotion;
    float k = floor(boilT);
    float f = smoothstep(0.0, 1.0, fract(boilT));
    vec2 boilA = vec2(hash(vec2(k, uSeed)), hash(vec2(uSeed, k))) * 300.0 * uMotion;
    vec2 boilB = vec2(hash(vec2(k + 1.0, uSeed)), hash(vec2(uSeed, k + 1.0))) * 300.0 * uMotion;

    for (int i = 0; i < MAX_STRIPES; i++) {
      if (i >= uCount) break;
      vec4 box = uBox[i];
      vec4 wob = uWobble[i];
      float fi = float(i);

      float len = box.w - box.z;
      float t = clamp((P.y - box.z) / len, 0.0, 1.0);

      // Gentle drift + breathing (a few px).
      float drift = sin(uTime * 0.35 + wob.z) * 2.5 * s * uMotion;
      float breathe = sin(uTime * 0.5 + wob.z * 1.7) * 1.8 * s * uMotion;

      float l = box.x + edgeOffset(wob, t, 0.0) + drift - breathe;
      float r = box.y + edgeOffset(wob, t, 1.0) + drift + breathe;
      float hw = 0.5 * (r - l);
      float cx = 0.5 * (l + r);

      // Rounded ends — cap height matches stripeCapHeight().
      float cap = min((box.y - box.x) * 0.42, len * 0.2);
      float yTop = box.z + cap;
      float yBot = box.w - cap;
      float hwy = hw;
      // Beyond the cap tips there is no wax at all.
      if (P.y < box.z - 2.0 * s || P.y > box.w + 2.0 * s) continue;
      if (P.y < yTop) {
        float kk = (yTop - P.y) / cap;
        hwy = hw * sqrt(max(0.0, 1.0 - kk * kk));
      } else if (P.y > yBot) {
        float kk = (P.y - yBot) / cap;
        hwy = hw * sqrt(max(0.0, 1.0 - kk * kk));
      }

      float d = abs(P.x - cx) - hwy;
      // Crayon edge: low-frequency wander + fine chalky breakup.
      d += (fbm(vec2(P.y / s * 0.045, fi * 7.3 + uSeed)) - 0.5) * 7.0 * s;
      d += (noise(P / s * 0.6 + fi * 3.1) - 0.5) * 3.5 * s;

      float cover = 1.0 - smoothstep(-1.2 * s, 1.2 * s, d);
      if (cover <= 0.0) continue;

      float toothA = crayonTooth(P + fi * 41.0, s, boilA);
      float toothB = crayonTooth(P + fi * 41.0, s, boilB);
      float tooth = mix(toothA, toothB, f);
      // Wax is denser away from the edges, thinner and patchier at them.
      float edgeFade = smoothstep(0.0, 10.0 * s, -d);
      float density = mix(0.32, 0.97, tooth) * mix(0.75, 1.0, edgeFade);

      vec3 wax = uColor[i];
      col *= mix(vec3(1.0), wax, cover * density);
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;
