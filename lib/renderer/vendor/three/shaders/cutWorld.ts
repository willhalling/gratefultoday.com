/**
 * cutWorld — the cut-world shader: one full-frame plane showing ONE pool
 * item at a time, hard-swapped at beat-driven cut points by the renderer.
 *
 * Ported from roughclip's `remotion/three/shaders/tiktokWorld.ts` (the
 * choreography-era revision with uGlitchEvent/uBreakoutZoom/uBreakoutEdge),
 * reshaped for wavecanvas's full-length background branch:
 *
 *   - FOCAL ZONE: a frame-locked middle band (portrait: the TikTok
 *     proportions; landscape: the full frame) shows the current item
 *     cover-fit and sharp, optionally displaced by a motion-effect
 *     atmosphere (pulse / rgb-glitch / rain / dream — same zone-space ports
 *     as tiktokWorld).
 *   - BACKDROP: outside the focal zone the SAME item renders cover-fit to
 *     the full frame through an always-on Poisson blur (uBackdropBlur,
 *     independent of the user-facing uBackgroundBlur reveal) — the "same
 *     item blurred behind the focal zone" look. Both layers follow the
 *     camera rig identically, so the backdrop parallaxes with the focal
 *     image through cuts.
 *   - FLASH CHOREOGRAPHY: uGlitchEvent composites a one-shot glitch over
 *     whatever atmosphere is active; uBreakoutZoom punches the focal image;
 *     uBreakoutEdge makes the travelling zone boundary organic; the zone
 *     bounds themselves animate (renderer drives uZoneTopV/uZoneBottomV) so
 *     the focal zone tears open to full frame on impacts.
 *
 * NOT ported from the roughclip original: musical collage grid, UV imprints
 * (wavecanvas draws watermark/lockup in the overlay layer), frame-level
 * brightness/contrast/saturation adjustments, solid-colour zones (the
 * blurred backdrop replaces them).
 *
 * The wavecanvas `tiktokWorld.ts` shader is deliberately LEFT UNTOUCHED —
 * it is golden-locked by the layout parity fixtures.
 */
import {
  COLOUR_GRADE_GLSL,
  COLOUR_GRADE_UNIFORMS_GLSL,
} from '../colourGrade';
import {
  BLUR_SAMPLE_UNIFORMS_GLSL,
  MAX_BACKGROUND_BLUR_RADIUS,
} from './blurBackground';
import { PULSE_SETTINGS } from './pulseMotion';
import { GLITCH_SETTINGS } from './rgbGlitch';
import { RAIN_SETTINGS } from './rain';
import { DREAM_SETTINGS } from './dream';

/** GLSL ES 1.00 has no implicit int→float conversion, so keep decimals. */
const f = (value: number): string => {
  const str = String(value);
  return str.includes('.') || str.includes('e') ? str : `${str}.0`;
};

/**
 * Motion-effect atmospheres — identical to tiktokWorld's zone-space ports
 * (uMotionEffect: 0 = none → base wave ripple, 1 = pulse, 2 = rgb-glitch,
 * 3 = rain, 4 = dream), except ttEffectGlitch takes its intensity as a
 * parameter so the choreography event can fire the same glitch machinery on
 * top of any atmosphere.
 */
const MOTION_EFFECTS_GLSL = /* glsl */ `
  #define TT_PULSE_AMP ${f(PULSE_SETTINGS.amplitude)}
  #define TT_PULSE_FREQ ${f(PULSE_SETTINGS.frequency)}
  #define TT_PULSE_DECAY_MIN ${f(PULSE_SETTINGS.decayMin)}
  #define TT_PULSE_DECAY_MAX ${f(PULSE_SETTINGS.decayMax)}
  #define TT_PULSE_BRIGHTNESS_KICK ${f(PULSE_SETTINGS.brightnessKick)}
  #define TT_PULSE_CENTER vec2(${f(PULSE_SETTINGS.center.x)}, ${f(PULSE_SETTINGS.center.y)})
  #define TT_PI 3.14159265359

  #define TT_GLITCH_SLICE_COUNT ${f(GLITCH_SETTINGS.sliceCount)}
  #define TT_GLITCH_MAX_SLICE_OFFSET ${f(GLITCH_SETTINGS.maxSliceOffset)}
  #define TT_GLITCH_RGB_OFFSET ${f(GLITCH_SETTINGS.rgbOffset)}
  #define TT_GLITCH_RED_DIR vec2(${f(GLITCH_SETTINGS.redDir.x)}, ${f(GLITCH_SETTINGS.redDir.y)})
  #define TT_GLITCH_GREEN_DIR vec2(${f(GLITCH_SETTINGS.greenDir.x)}, ${f(GLITCH_SETTINGS.greenDir.y)})
  #define TT_GLITCH_BLUE_DIR vec2(${f(GLITCH_SETTINGS.blueDir.x)}, ${f(GLITCH_SETTINGS.blueDir.y)})
  #define TT_GLITCH_BIG_TEAR_THRESHOLD ${f(GLITCH_SETTINGS.bigTearThreshold)}
  #define TT_GLITCH_BIG_TEAR_MULTIPLIER ${f(GLITCH_SETTINGS.bigTearMultiplier)}
  #define TT_GLITCH_BAND_COVERAGE ${f(GLITCH_SETTINGS.bandCoverage)}
  #define TT_GLITCH_VERTICAL_JITTER ${f(GLITCH_SETTINGS.verticalJitter)}
  #define TT_GLITCH_FRINGE_BOOST ${f(GLITCH_SETTINGS.fringeBoost)}
  #define TT_LUMA vec3(0.299, 0.587, 0.114)

  #define TT_RAIN_COLUMNS ${f(RAIN_SETTINGS.columns)}
  #define TT_RAIN_GRID_ROWS 2.0
  #define TT_RAIN_FINE_SCALE ${f(RAIN_SETTINGS.fineLayerScale)}
  #define TT_RAIN_STATIC_DENSITY ${f(RAIN_SETTINGS.staticDensity)}
  #define TT_RAIN_BLUR_MIN ${f(RAIN_SETTINGS.blurMin)}
  #define TT_RAIN_BLUR_MAX ${f(RAIN_SETTINGS.blurMax)}
  #define TT_RAIN_REFRACTION ${f(RAIN_SETTINGS.refraction)}
  #define TT_RAIN_SCROLL_SPEED ${f(RAIN_SETTINGS.scrollSpeed)}
  #define TT_RAIN_TIME_SCALE ${f(RAIN_SETTINGS.timeScale)}

  #define TT_DREAM_FIELD_SCALE ${f(DREAM_SETTINGS.fieldScale)}
  #define TT_DREAM_TIME_SCALE ${f(DREAM_SETTINGS.timeScale)}
  #define TT_DREAM_AMPLITUDE ${f(DREAM_SETTINGS.amplitude)}
  #define TT_DREAM_ENERGY_RESPONSE ${f(DREAM_SETTINGS.energyResponse)}
  #define TT_DREAM_SMEAR ${f(DREAM_SETTINGS.smear)}
  #define TT_DREAM_BREATHE ${f(DREAM_SETTINGS.breathe)}

  // Zone-space cover-fit sample of the pool item (blur-aware — the
  // uBackgroundBlur reveal + choreo motion blur reach the focal zone here).
  vec2 ttCoverWorld(vec2 uv) {
    return coverUV(uv, vec2(uResolution.x, uZoneHeightPx), uImageRes);
  }
  vec3 ttSampleWorld(vec2 uv) {
    return sampleBackgroundBlurred(uImage, clamp(ttCoverWorld(uv), vec2(0.001), vec2(0.999)));
  }

  // ── Pulse (ambient radial ripple — fragment-space port) ─────────────────
  vec3 ttEffectPulse(vec2 uv) {
    float dist = distance(uv, TT_PULSE_CENTER);
    vec2 dir = (uv - TT_PULSE_CENTER) / max(dist, 0.0005);
    if (uPulseBoost > 0.5) {
      float ripple = sin(dist * 24.0 - uPulseTime * 0.6) * exp(-dist * 2.5);
      float amp = 0.004 + uPulseEnergy * 0.022;
      vec3 col = ttSampleWorld(uv + dir * ripple * amp);
      float pulse = 0.5 + 0.5 * sin(uPulseTime * 0.23 - dist * 7.0);
      float luma = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(col, vec3(luma), pulse * 0.4 * (0.3 + uPulseEnergy));
      col += ripple * (0.6 + uPulseEnergy) * 0.35;
      return col;
    }
    float decay = clamp(dist, TT_PULSE_DECAY_MIN, TT_PULSE_DECAY_MAX);
    float ripple = sin(-TT_PI * TT_PULSE_FREQ * dist + uPulseTime) * (TT_PULSE_AMP / decay);
    ripple *= uPulseRipple;
    vec3 col = ttSampleWorld(uv + dir * ripple);
    col += ripple * TT_PULSE_BRIGHTNESS_KICK;
    return col;
  }

  // ── RGB glitch (slices + channel split in random vertical clusters) ─────
  float ttGlitchHash(float n) {
    return fract(sin(n) * 43758.5453);
  }
  float ttGlitchCluster(float seedOffset, float y) {
    float centre = ttGlitchHash(uGlitchSeed * 13.7 + seedOffset * 71.3);
    float clusterWidth = 0.02 + 0.10 * ttGlitchHash(uGlitchSeed * 29.1 + seedOffset * 17.9);
    float clusterOn = step(0.6, ttGlitchHash(uGlitchSeed * 7.7 + seedOffset * 3.1));
    float d = abs(y - centre);
    return clusterOn * smoothstep(clusterWidth, clusterWidth * 0.3, d);
  }
  vec3 ttEffectGlitch(vec2 uv0, float fxIntensity) {
    float intensity = clamp(fxIntensity, 0.0, 1.5);

    float clusterMask = 0.0;
    clusterMask = max(clusterMask, ttGlitchCluster(0.0, uv0.y));
    clusterMask = max(clusterMask, ttGlitchCluster(1.0, uv0.y));
    clusterMask = max(clusterMask, ttGlitchCluster(2.0, uv0.y));

    float jitter = (ttGlitchHash(uGlitchSeed * 1.7) - 0.5) * 2.0 * TT_GLITCH_VERTICAL_JITTER * intensity;

    float band = floor(uv0.y * TT_GLITCH_SLICE_COUNT);
    float bandRand = ttGlitchHash(band * 17.31 + uGlitchSeed * 91.7);
    float bandGate = ttGlitchHash(band * 7.13 + uGlitchSeed * 37.3);
    float gateThreshold = 1.0 - TT_GLITCH_BAND_COVERAGE * min(intensity, 1.0);
    float bandOn = step(gateThreshold, bandGate);
    float bigTear = 1.0 +
      step(TT_GLITCH_BIG_TEAR_THRESHOLD, ttGlitchHash(band * 3.7 + uGlitchSeed * 13.1)) *
        (TT_GLITCH_BIG_TEAR_MULTIPLIER - 1.0);
    float sliceOffset =
      (bandRand - 0.5) * 2.0 * TT_GLITCH_MAX_SLICE_OFFSET * intensity * bandOn *
      bigTear * clusterMask;

    vec2 uv = vec2(uv0.x + sliceOffset, uv0.y + jitter);

    vec2 rgbShift =
      TT_GLITCH_RGB_OFFSET * intensity * clusterMask *
      vec2(1.0, uResolution.x / uZoneHeightPx);

    vec3 sBase = ttSampleWorld(uv);
    vec3 sR = ttSampleWorld(uv + TT_GLITCH_RED_DIR * rgbShift);
    vec3 sG = ttSampleWorld(uv + TT_GLITCH_GREEN_DIR * rgbShift);
    vec3 sB = ttSampleWorld(uv + TT_GLITCH_BLUE_DIR * rgbShift);

    vec3 bodyCol = mix(sBase, vec3(dot(sBase, TT_LUMA)), uGlitchGrayMix);
    float rS = mix(sR.r, dot(sR, TT_LUMA), uGlitchGrayMix);
    float gS = mix(sG.g, dot(sG, TT_LUMA), uGlitchGrayMix);
    float bS = mix(sB.b, dot(sB, TT_LUMA), uGlitchGrayMix);
    vec3 fringe = vec3(rS, gS, bS) - bodyCol;

    return bodyCol + fringe * (1.0 + TT_GLITCH_FRINGE_BOOST);
  }

  // ── Rain (drops on fogged glass over the pool item) ─────────────────────
  float ttRainHash1(float n) {
    return fract(sin(n) * 43758.5453);
  }
  vec3 ttRainHash3(float p) {
    return vec3(ttRainHash1(p), ttRainHash1(p + 17.17), ttRainHash1(p + 41.41));
  }
  float ttRainSaw(float b, float t) {
    return smoothstep(0.0, b, t) * smoothstep(1.0, b, t);
  }
  vec2 ttRainRunningLayer(vec2 uv, float t) {
    vec2 UV = uv;

    uv.y += t * TT_RAIN_SCROLL_SPEED;
    vec2 grid = vec2(TT_RAIN_COLUMNS, TT_RAIN_GRID_ROWS);

    uv.y += ttRainHash1(floor(uv.x * grid.x));

    vec2 id = floor(uv * grid);
    vec3 n = ttRainHash3(id.x * 35.2 + id.y * 2376.1);
    vec2 st = fract(uv * grid);
    st.x -= 0.5;

    float x = n.x - 0.5;
    float wy = UV.y * 20.0;
    x += sin(wy + sin(wy)) * (0.5 - abs(x)) * (n.z - 0.5);
    x *= 0.7;

    float ti = fract(t + n.z);
    float y = (ttRainSaw(0.85, ti) - 0.5) * 0.9 + 0.5;

    float head = smoothstep(0.4, 0.0, length((st - vec2(x, y)) * vec2(1.0, 6.0)));

    float r = sqrt(max(1.0 - smoothstep(y, 1.0, st.y), 0.0001));
    float cd = abs(st.x - x);
    float front = smoothstep(-0.02, 0.02, st.y - y);
    float trail = smoothstep(0.23 * r, 0.15 * r * r, cd) * front * r * r;

    float beadY = fract(UV.y * 10.0) - 0.5;
    float beads = smoothstep(0.3, 0.0, length(vec2(st.x - x, beadY)));

    return vec2(head + beads * r * front, trail);
  }
  float ttRainStaticLayer(vec2 uv, float t) {
    vec2 g = uv * TT_RAIN_STATIC_DENSITY;
    vec2 id = floor(g);
    vec2 fpos = fract(g) - 0.5;

    vec3 n = ttRainHash3(id.x * 107.45 + id.y * 3543.65);
    vec2 p = (n.xy - 0.5) * 0.7;
    float d = length(fpos - p);

    float fade = ttRainSaw(0.025, fract(t + n.z));
    return smoothstep(0.3, 0.0, d) * fract(n.z * 10.0) * fade;
  }
  vec2 ttRainDropField(vec2 uv, float t, float amount) {
    float statics = ttRainStaticLayer(uv, t) * smoothstep(-0.5, 1.0, amount) * 2.0;
    vec2 coarse = ttRainRunningLayer(uv, t) * smoothstep(0.25, 0.75, amount);
    vec2 fine = ttRainRunningLayer(uv * TT_RAIN_FINE_SCALE, t) * smoothstep(0.0, 0.5, amount);

    float drops = smoothstep(0.3, 1.0, statics + coarse.x + fine.x);
    float trail = max(coarse.y, fine.y);

    return vec2(drops, trail);
  }
  vec3 ttEffectRain(vec2 uv0) {
    float t = uTime * TT_RAIN_TIME_SCALE;
    float amount = clamp(uRainIntensity * (0.7 + 0.3 * sin(uTime * 0.05)), 0.0, 1.0);

    vec2 aspect = vec2(uResolution.x / uZoneHeightPx, 1.0);
    vec2 uv = (uv0 - 0.5) * aspect;

    vec2 c = ttRainDropField(uv, t, amount);

    vec2 e = vec2(0.0015, 0.0);
    float cx = ttRainDropField(uv + e.xy, t, amount).x;
    float cy = ttRainDropField(uv + e.yx, t, amount).x;
    vec2 n = vec2(cx - c.x, cy - c.x) * TT_RAIN_REFRACTION;
    vec2 nZone = n / aspect;

    float focus = mix(TT_RAIN_BLUR_MAX - c.y, TT_RAIN_BLUR_MIN, smoothstep(0.1, 0.2, c.x));
    focus = clamp(focus, 0.0, TT_RAIN_BLUR_MAX);

    vec2 cuv = clamp(ttCoverWorld(uv0 + nZone), vec2(0.001), vec2(0.999));
    vec3 blurred = sampleBackgroundBlurred(uImage, cuv);
    vec3 sharp = texture2D(uImage, cuv).rgb;
    return mix(blurred, sharp, 1.0 - focus / TT_RAIN_BLUR_MAX);
  }

  // ── Dream (curl-noise liquid drift) ─────────────────────────────────────
  // 2D simplex noise by Ashima Arts (Ian McEwan), MIT license — as used by
  // the standalone dream shader.
  vec3 ttDreamPermute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  float ttDreamSnoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = ttDreamPermute(ttDreamPermute(i.y + vec3(0.0, i1.y, 1.0)) +
                     i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
                            dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  float ttDreamPotential(vec2 p, float t) {
    float v = 0.0;
    float a = 0.55;
    vec2 q = p + vec2(t * 0.06, -t * 0.04);

    for (int i = 0; i < 3; i++) {
      v += a * ttDreamSnoise(q);
      q = q * 2.03 + vec2(1.7, 9.2) + vec2(t * 0.03, t * 0.02);
      a *= 0.5;
    }

    return v;
  }
  vec2 ttDreamCurl(vec2 p, float t) {
    float e = 0.08;
    float dx = ttDreamPotential(p + vec2(e, 0.0), t) - ttDreamPotential(p - vec2(e, 0.0), t);
    float dy = ttDreamPotential(p + vec2(0.0, e), t) - ttDreamPotential(p - vec2(0.0, e), t);
    return vec2(dy, -dx) / (2.0 * e);
  }
  vec3 ttEffectDream(vec2 uv0) {
    float t = uTime * TT_DREAM_TIME_SCALE;

    vec2 aspect = vec2(uResolution.x / uZoneHeightPx, 1.0);
    vec2 p = (uv0 - 0.5) * aspect * TT_DREAM_FIELD_SCALE;

    vec2 c1 = ttDreamCurl(p, t);
    vec2 c2 = ttDreamCurl(p * 2.3 + c1 * 0.35 + 5.0, t * 1.4);
    vec2 flow = (c1 + 0.35 * c2) / 2.5;

    float movement = 1.0 + TT_DREAM_ENERGY_RESPONSE * clamp(uDreamEnergy, 0.0, 1.5);
    vec2 disp = flow * (TT_DREAM_AMPLITUDE * uDreamIntensity * movement) / TT_DREAM_FIELD_SCALE;

    float breatheZoom = 1.0 + TT_DREAM_BREATHE * uDreamIntensity * sin(t * 0.15 + 1.3);
    vec2 uv = (uv0 - 0.5) / breatheZoom + 0.5;

    return ttSampleWorld(uv + disp * (1.0 + TT_DREAM_SMEAR * 0.6)) * 0.25 +
      ttSampleWorld(uv + disp) * 0.5 +
      ttSampleWorld(uv + disp * (1.0 - TT_DREAM_SMEAR * 0.6)) * 0.25;
  }
`;

export const CUT_WORLD_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Uniforms:
 *   uTime/uWave/uFreq/uSpeed — wave surface + effect clocks
 *   uImage/uResolution/uImageRes — current pool item texture + sizes
 *     (swapped by the renderer at cut points)
 *   uPrevImage/uPrevImageRes/uCrossfade — previous shot + its weight during a
 *     crossfade transition (0 = off; the branch is skipped entirely)
 *   uRigPose/uPlaneMargin — camera rig pose (x px, y px, zoom) + overscan
 *   uZoneTopV/uZoneBottomV/uZoneHeightPx — focal-zone bounds (frame V, y-up);
 *     the renderer animates them per frame for the breakout
 *   uMotionEffect + the uPulse/uGlitch/uRain/uDream driver uniforms —
 *     zone-space atmospheres
 *   uGlitchEvent — one-shot choreography glitch envelope (0 = idle)
 *   uBreakoutZoom/uBreakoutEdge — breakout punch + travelling-edge wobble
 *   uBackdropBlur/uBackdropDarken — always-on blurred backdrop treatment
 *   uBackgroundBlur/uBlurResolution — reveal blur on the FOCAL zone
 *     (user backgroundBlur setting; the tiktokWorld sampler)
 *   grade uniforms — shared brand grade (colourGrade.ts chunks)
 */
export const CUT_WORLD_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;
  uniform float     uTime;
  uniform float     uWave;
  uniform float     uFreq;
  uniform float     uSpeed;
  uniform sampler2D uImage;
  uniform vec2      uResolution;
  uniform vec2      uImageRes;
  uniform sampler2D uPrevImage;
  uniform vec2      uPrevImageRes;
  uniform float     uCrossfade;
  uniform vec3      uRigPose;
  uniform float     uPlaneMargin;
  uniform float     uZoneTopV;
  uniform float     uZoneBottomV;
  uniform float     uZoneHeightPx;
  // Motion-effect atmospheres. uMotionEffect: 0 = none (base wave),
  // 1 = pulse, 2 = rgb-glitch, 3 = rain, 4 = dream.
  uniform float     uMotionEffect;
  uniform float     uPulseTime;
  uniform float     uPulseRipple;
  uniform float     uPulseBoost;
  uniform float     uPulseEnergy;
  uniform float     uGlitchSeed;
  uniform float     uGlitchIntensity;
  uniform float     uGlitchGrayMix;
  uniform float     uRainIntensity;
  uniform float     uDreamIntensity;
  uniform float     uDreamEnergy;
  // Choreography event envelope (0 = idle) — fires the glitch branch once at
  // an impact regardless of the selected atmosphere.
  uniform float     uGlitchEvent;
  // BREAKOUT — overshoot zoom punch on arrival (1 at rest) and organic
  // boundary wobble while the zone edges travel (0 when settled).
  uniform float     uBreakoutZoom;
  uniform float     uBreakoutEdge;
  // Backdrop treatment (always blurred; independent of uBackgroundBlur).
  uniform float     uBackdropBlur;
  uniform float     uBackdropDarken;
  ${COLOUR_GRADE_UNIFORMS_GLSL}
  ${BLUR_SAMPLE_UNIFORMS_GLSL}
  varying vec2      vUv;

  vec2 coverUV(vec2 uv, vec2 plane, vec2 image) {
    float imageAR = image.x / image.y;
    float planeAR = plane.x / plane.y;
    vec2 result = uv;
    if (planeAR >= imageAR) {
      float s = imageAR / planeAR;
      result.y = uv.y * s + (1.0 - s) * 0.5;
    } else {
      float s = planeAR / imageAR;
      result.x = uv.x * s + (1.0 - s) * 0.5;
    }
    return result;
  }

  // blurBackground.ts's sampleBackgroundBlurred (focal-zone reveal blur).
  ${''/* BLUR_SAMPLE_GLSL inlined below — same 13-tap Poisson kernel. */}
  vec3 sampleBackgroundBlurred(sampler2D tex, vec2 uv) {
    if (uBackgroundBlur < 0.001) return texture2D(tex, uv).rgb;
    float radius = uBackgroundBlur * ${MAX_BACKGROUND_BLUR_RADIUS.toFixed(1)};
    vec2 scale = radius / uBlurResolution;
    vec3 c = texture2D(tex, uv).rgb * 0.2256;
    c += texture2D(tex, uv + vec2(-0.326212, -0.40581) * scale).rgb * 0.1311;
    c += texture2D(tex, uv + vec2(-0.840144, -0.07358) * scale).rgb * 0.0544;
    c += texture2D(tex, uv + vec2(-0.695914, 0.457137) * scale).rgb * 0.0564;
    c += texture2D(tex, uv + vec2(-0.203345, 0.620716) * scale).rgb * 0.0961;
    c += texture2D(tex, uv + vec2(0.96234, -0.194983) * scale).rgb * 0.0328;
    c += texture2D(tex, uv + vec2(0.473434, -0.480026) * scale).rgb * 0.0909;
    c += texture2D(tex, uv + vec2(0.519456, 0.767022) * scale).rgb * 0.0406;
    c += texture2D(tex, uv + vec2(0.185461, -0.893124) * scale).rgb * 0.0427;
    c += texture2D(tex, uv + vec2(0.507431, 0.064425) * scale).rgb * 0.1336;
    c += texture2D(tex, uv + vec2(0.89642, 0.412458) * scale).rgb * 0.0322;
    c += texture2D(tex, uv + vec2(-0.32194, -0.932615) * scale).rgb * 0.0323;
    c += texture2D(tex, uv + vec2(-0.791559, -0.59771) * scale).rgb * 0.0316;
    c *= (1.0 - uBackgroundBlur * 0.2);
    return c;
  }

  // Same Poisson kernel driven by the ALWAYS-ON backdrop blur.
  vec3 sampleBackdropBlurred(sampler2D tex, vec2 uv) {
    float radius = max(uBackdropBlur, 0.05) * ${MAX_BACKGROUND_BLUR_RADIUS.toFixed(1)};
    vec2 scale = radius / uBlurResolution;
    vec3 c = texture2D(tex, uv).rgb * 0.2256;
    c += texture2D(tex, uv + vec2(-0.326212, -0.40581) * scale).rgb * 0.1311;
    c += texture2D(tex, uv + vec2(-0.840144, -0.07358) * scale).rgb * 0.0544;
    c += texture2D(tex, uv + vec2(-0.695914, 0.457137) * scale).rgb * 0.0564;
    c += texture2D(tex, uv + vec2(-0.203345, 0.620716) * scale).rgb * 0.0961;
    c += texture2D(tex, uv + vec2(0.96234, -0.194983) * scale).rgb * 0.0328;
    c += texture2D(tex, uv + vec2(0.473434, -0.480026) * scale).rgb * 0.0909;
    c += texture2D(tex, uv + vec2(0.519456, 0.767022) * scale).rgb * 0.0406;
    c += texture2D(tex, uv + vec2(0.185461, -0.893124) * scale).rgb * 0.0427;
    c += texture2D(tex, uv + vec2(0.507431, 0.064425) * scale).rgb * 0.1336;
    c += texture2D(tex, uv + vec2(0.89642, 0.412458) * scale).rgb * 0.0322;
    c += texture2D(tex, uv + vec2(-0.32194, -0.932615) * scale).rgb * 0.0323;
    c += texture2D(tex, uv + vec2(-0.791559, -0.59771) * scale).rgb * 0.0316;
    return c;
  }

  ${COLOUR_GRADE_GLSL}
  ${MOTION_EFFECTS_GLSL}

  void main() {
    // Frame-space V: undo the camera rig so the focal-zone edges stay locked
    // to the frame while the world moves behind them (tiktokWorld mapping).
    vec2 frameUv = vec2(
      0.5 + (((vUv.x - 0.5) * uResolution.x * uPlaneMargin - uRigPose.x) * uRigPose.z / uResolution.x),
      0.5 + (((vUv.y - 0.5) * uResolution.y * uPlaneMargin - uRigPose.y) * uRigPose.z / uResolution.y)
    );

    // The focal zone's plane-space edges follow the camera so the world keeps
    // travelling with the rig. BOTH axes rig-corrected (see tiktokWorld).
    float zoneBottomPx = (1.0 - uZoneBottomV) * uResolution.y;
    float zoneTopPx = (1.0 - uZoneTopV) * uResolution.y;
    float planeVBottom = 0.5 + ((((1.0 - zoneBottomPx / uResolution.y) - 0.5) * uResolution.y) / uRigPose.z + uRigPose.y) / (uResolution.y * uPlaneMargin);
    float planeVTop    = 0.5 + ((((1.0 - zoneTopPx    / uResolution.y) - 0.5) * uResolution.y) / uRigPose.z + uRigPose.y) / (uResolution.y * uPlaneMargin);
    float planeULeft   = 0.5 + (((0.0 - 0.5) * uResolution.x) / uRigPose.z + uRigPose.x) / (uResolution.x * uPlaneMargin);
    float planeURight  = 0.5 + (((1.0 - 0.5) * uResolution.x) / uRigPose.z + uRigPose.x) / (uResolution.x * uPlaneMargin);
    vec2 zoneUv = vec2(
      (vUv.x - planeULeft) / (planeURight - planeULeft),
      (vUv.y - planeVBottom) / (planeVTop - planeVBottom)
    );
    // BREAKOUT zoom punch — overshoot scale around the zone centre.
    if (uBreakoutZoom > 1.0001) {
      zoneUv = (zoneUv - 0.5) / uBreakoutZoom + 0.5;
    }
    vec2 imageUv = coverUV(zoneUv, vec2(uResolution.x, uZoneHeightPx), uImageRes);

    // Focal-zone sampling — a motion-effect atmosphere replaces the base
    // wave ripple when one is active.
    vec3 col;
    if (uMotionEffect > 0.5) {
      if (uMotionEffect < 1.5) {
        col = ttEffectPulse(zoneUv);
      } else if (uMotionEffect < 2.5) {
        col = ttEffectGlitch(zoneUv, uGlitchIntensity);
      } else if (uMotionEffect < 3.5) {
        col = ttEffectRain(zoneUv);
      } else {
        col = ttEffectDream(zoneUv);
      }
    } else {
      // Fluid horizontal ripple — same mapping as the shared wave shader.
      float waveStrength = 0.0012 + uWave * 0.0045;
      float wave = sin(imageUv.y * uFreq + uTime * uSpeed) * waveStrength;
      col = sampleBackgroundBlurred(uImage, vec2(imageUv.x + wave, imageUv.y));
    }

    // Choreography event — one short deliberate glitch/displacement fired at
    // an impact, composited over whatever atmosphere (or plain wave) runs.
    if (uGlitchEvent > 0.001) {
      vec3 glitchCol = ttEffectGlitch(zoneUv, uGlitchEvent * 1.2);
      col = mix(col, glitchCol, clamp(uGlitchEvent * 1.4, 0.0, 0.9));
    }

    // BACKDROP — the same pool item cover-fit to the FULL frame, blurred,
    // following the rig like the focal zone (full-frame zone bounds).
    float planeVBottomFull = 0.5 + (((0.0 - 0.5) * uResolution.y) / uRigPose.z + uRigPose.y) / (uResolution.y * uPlaneMargin);
    float planeVTopFull    = 0.5 + (((1.0 - 0.5) * uResolution.y) / uRigPose.z + uRigPose.y) / (uResolution.y * uPlaneMargin);
    vec2 backdropUv = vec2(
      (vUv.x - planeULeft) / (planeURight - planeULeft),
      (vUv.y - planeVBottomFull) / (planeVTopFull - planeVBottomFull)
    );
    vec2 backdropImageUv = clamp(coverUV(backdropUv, uResolution, uImageRes), vec2(0.001), vec2(0.999));
    vec3 backdrop = sampleBackdropBlurred(uImage, backdropImageUv);
    backdrop *= (1.0 - uBackdropDarken);

    // BREAKOUT edge — while the zone boundary travels it becomes organic.
    if (uBreakoutEdge > 0.001) {
      frameUv.y += ttDreamSnoise(vec2(frameUv.x * 4.0, uTime * 2.5)) * 0.018 * uBreakoutEdge;
    }

    // ~1px frame feather — hard edge per the design, no aliasing shimmer.
    float feather = 1.5 / uResolution.y;
    float inMiddle =
      smoothstep(uZoneBottomV - feather, uZoneBottomV + feather, frameUv.y) *
      (1.0 - smoothstep(uZoneTopV - feather, uZoneTopV + feather, frameUv.y));
    col = mix(backdrop, col, inMiddle);

    // CROSSFADE transition — blend in the previous shot (same zone + backdrop
    // treatment, plain sample) while the incoming shot fades up.
    if (uCrossfade > 0.001) {
      vec2 prevUv = coverUV(zoneUv, vec2(uResolution.x, uZoneHeightPx), uPrevImageRes);
      vec3 prevCol = sampleBackgroundBlurred(uPrevImage, prevUv);
      vec2 prevBackdropUv = clamp(coverUV(backdropUv, uResolution, uPrevImageRes), vec2(0.001), vec2(0.999));
      vec3 prevBackdrop = sampleBackdropBlurred(uPrevImage, prevBackdropUv) * (1.0 - uBackdropDarken);
      col = mix(col, mix(prevBackdrop, prevCol, inMiddle), uCrossfade);
    }

    // Shared brand colour grade (+ grain) over focal zone and backdrop alike.
    col = applyColourGrade(col, vUv);

    gl_FragColor = vec4(col, 1.0);
  }
`;
