/**
 * Rain shaders — raindrops on a fogged pane of glass in front of the
 * background image.
 *
 * Original WaveCanvas implementation of the classic rain-on-glass recipe
 * (fogged glass via mip-LOD blur, trails that wipe the fog clear, refraction
 * from the drop field's gradient). Written from scratch — the well-known
 * Shadertoy references for this look are CC BY-NC-SA (non-commercial), so
 * none of their code is used here.
 *
 * How it reads:
 *   - The field lives in aspect-correct space (y spans one unit) so the
 *     drops keep their proportions on any output aspect ratio.
 *   - runningLayer() tiles tall cells (twice as tall as wide), staggers the
 *     columns vertically, and runs one drop per cell: a long accelerating
 *     fall on a sawtooth cycle, a tight horizontal snake that damps out near
 *     the column edges, a fog-wiping wake above the head, and small residue
 *     beads left along the path.
 *   - staticLayer() adds tiny droplets that bead, pop in fast and evaporate
 *     slowly. A second, finer running layer adds depth.
 *   - The field's gradient gives refraction normals; its trail channel
 *     reduces blur; the drop channel sharpens to a clear lens.
 *   - textureLod on a mipmapped image texture gives the fog — cheap and
 *     fully deterministic from uTime (no canvas, no per-frame uploads).
 *   - Optional cover imprint: the cover art is composited INSIDE the glass
 *     (same refraction + fog, soft emboss border), so it feels part of the
 *     scene rather than a sticker on top of it.
 *
 * The rain is deliberately NOT audio-reactive: steady weather reads as far
 * more premium over music.
 */

import {
  COVER_IMPRINT_GLSL,
  COVER_IMPRINT_UNIFORMS_GLSL,
} from '../coverImprint';
import {
  COLOUR_GRADE_GLSL,
  COLOUR_GRADE_UNIFORMS_GLSL,
} from '../colourGrade';
import {
  UV_IMPRINTS_GLSL,
  UV_IMPRINTS_UNIFORMS_GLSL,
} from '../uvImprints';
import {
  BLUR_SAMPLE_GLSL,
  BLUR_SAMPLE_UNIFORMS_GLSL,
} from './blurBackground';

export interface RainSettings {
  /** Drop columns per frame-height unit (cells are twice as tall as wide). */
  columns: number;
  /** The finer second layer is the field scaled by this factor. */
  fineLayerScale: number;
  /** Static droplet grid density (cells per frame-height unit). */
  staticDensity: number;
  /** Global speed multiplier for the drop field. */
  timeScale: number;
  /** Field scroll speed (how fast drops fall), per scaled second. */
  scrollSpeed: number;
  /** Mip LOD inside drops — 0 would be perfectly sharp. */
  blurMin: number;
  /** Mip LOD on the fogged glass. */
  blurMax: number;
  /** Refraction strength multiplier on the field gradient. */
  refraction: number;
}

export const RAIN_SETTINGS: RainSettings = {
  columns: 12,
  fineLayerScale: 1.85,
  staticDensity: 40,
  timeScale: 0.2,
  scrollSpeed: 0.75,
  blurMin: 2,
  blurMax: 6,
  refraction: 1.5,
};

/** GLSL ES 1.00 has no implicit int→float conversion, so keep decimals. */
const f = (value: number): string => {
  const str = String(value);
  return str.includes('.') || str.includes('e') ? str : `${str}.0`;
};
export const RAIN_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const RAIN_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;

out vec4 fragColor;

uniform float uTime;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform vec2 uImageResolution;
uniform float uIntensity;
${COVER_IMPRINT_UNIFORMS_GLSL}
${UV_IMPRINTS_UNIFORMS_GLSL}
${COLOUR_GRADE_UNIFORMS_GLSL}
${BLUR_SAMPLE_UNIFORMS_GLSL}

#define COLUMNS ${f(RAIN_SETTINGS.columns)}
#define GRID_ROWS 2.0
#define FINE_SCALE ${f(RAIN_SETTINGS.fineLayerScale)}
#define STATIC_DENSITY ${f(RAIN_SETTINGS.staticDensity)}
#define BLUR_MIN ${f(RAIN_SETTINGS.blurMin)}
#define BLUR_MAX ${f(RAIN_SETTINGS.blurMax)}
#define REFRACTION ${f(RAIN_SETTINGS.refraction)}
#define SCROLL_SPEED ${f(RAIN_SETTINGS.scrollSpeed)}
#define TIME_SCALE ${f(RAIN_SETTINGS.timeScale)}

float hash1(float n) {
  return fract(sin(n) * 43758.5453);
}

vec3 hash3(float p) {
  return vec3(hash1(p), hash1(p + 17.17), hash1(p + 41.41));
}

// Rises over [0, b], falls over [b, 1] — the drop-cycle envelope.
float saw(float b, float t) {
  return smoothstep(0.0, b, t) * smoothstep(1.0, b, t);
}

// Cover-fit UV so the image keeps its aspect ratio on any output size.
vec2 coverUv(vec2 uv, vec2 canvasResolution, vec2 imageResolution) {
  float canvasAspect = canvasResolution.x / canvasResolution.y;
  float imageAspect = imageResolution.x / imageResolution.y;
  vec2 scale = vec2(1.0);

  if (canvasAspect > imageAspect) {
    scale.y = imageAspect / canvasAspect;
  } else {
    scale.x = canvasAspect / imageAspect;
  }

  return (uv - 0.5) * scale + 0.5;
}

// One grid layer of running drops with fog-wiping trails and residue beads.
// Returns (dropness, trail).
vec2 runningLayer(vec2 uv, float t) {
  vec2 UV = uv;

  uv.y += t * SCROLL_SPEED;
  vec2 grid = vec2(COLUMNS, GRID_ROWS);

  // Stagger whole columns vertically so drops never line up in rows.
  uv.y += hash1(floor(uv.x * grid.x));

  vec2 id = floor(uv * grid);
  vec3 n = hash3(id.x * 35.2 + id.y * 2376.1);
  vec2 st = fract(uv * grid);
  st.x -= 0.5;

  // Head x wanders in a tight snake that damps out near the column edges,
  // so a drop never strays into the next column.
  float x = n.x - 0.5;
  float wy = UV.y * 20.0;
  x += sin(wy + sin(wy)) * (0.5 - abs(x)) * (n.z - 0.5);
  x *= 0.7;

  // Head y: a long accelerating fall, then a quick reset — a sawtooth cycle
  // phase-offset per cell.
  float ti = fract(t + n.z);
  float y = (saw(0.85, ti) - 0.5) * 0.9 + 0.5;

  // Head — squashed slightly by the tall cell aspect.
  float head = smoothstep(0.4, 0.0, length((st - vec2(x, y)) * vec2(1.0, 6.0)));

  // Trail — a wake above the head, widening and strengthening near it.
  // The small floor on r keeps the smoothstep edges from ever collapsing
  // to zero width (undefined behaviour).
  float r = sqrt(max(1.0 - smoothstep(y, 1.0, st.y), 0.0001));
  float cd = abs(st.x - x);
  float front = smoothstep(-0.02, 0.02, st.y - y);
  float trail = smoothstep(0.23 * r, 0.15 * r * r, cd) * front * r * r;

  // Residue — small beads the head leaves behind along its path.
  float beadY = fract(UV.y * 10.0) - 0.5;
  float beads = smoothstep(0.3, 0.0, length(vec2(st.x - x, beadY)));

  return vec2(head + beads * r * front, trail);
}

// Small droplets beading on the pane — each lives on its own slow cycle:
// pops in fast, evaporates slowly.
float staticLayer(vec2 uv, float t) {
  vec2 g = uv * STATIC_DENSITY;
  vec2 id = floor(g);
  vec2 fpos = fract(g) - 0.5;

  vec3 n = hash3(id.x * 107.45 + id.y * 3543.65);
  vec2 p = (n.xy - 0.5) * 0.7;
  float d = length(fpos - p);

  float fade = saw(0.025, fract(t + n.z));
  return smoothstep(0.3, 0.0, d) * fract(n.z * 10.0) * fade;
}

// The full drop height field. x = drop coverage, y = trail (fog-wipe).
// Each layer fades in over its own band of the rain amount, so the weather
// thickens layer by layer.
vec2 dropField(vec2 uv, float t, float amount) {
  float statics = staticLayer(uv, t) * smoothstep(-0.5, 1.0, amount) * 2.0;
  vec2 coarse = runningLayer(uv, t) * smoothstep(0.25, 0.75, amount);
  vec2 fine = runningLayer(uv * FINE_SCALE, t) * smoothstep(0.0, 0.5, amount);

  float drops = smoothstep(0.3, 1.0, statics + coarse.x + fine.x);
  float trail = max(coarse.y, fine.y);

  return vec2(drops, trail);
}

#define IMPRINT_SAMPLE(t, uv) texture(t, uv)
#define UV_IMPRINT_SAMPLE(t, uv) textureLod(t, uv, 0.0)
${COVER_IMPRINT_GLSL}
${UV_IMPRINTS_GLSL}
${COLOUR_GRADE_GLSL}
${BLUR_SAMPLE_GLSL}

void main() {
  float t = uTime * TIME_SCALE;
  // The weather slowly thickens and eases on its own — never audio-synced.
  float amount = clamp(uIntensity * (0.7 + 0.3 * sin(uTime * 0.05)), 0.0, 1.0);

  // Aspect-correct space: y spans one unit, so drops keep their shape at
  // any output aspect ratio.
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 uv = (vUv - 0.5) * aspect;

  vec2 c = dropField(uv, t, amount);

  // Refraction normals from the field gradient (two extra evaluations).
  vec2 e = vec2(0.0015, 0.0);
  float cx = dropField(uv + e.xy, t, amount).x;
  float cy = dropField(uv + e.yx, t, amount).x;
  vec2 n = vec2(cx - c.x, cy - c.x) * REFRACTION;
  // Convert the refraction gradient from aspect-corrected space back to
  // frame-UV space before adding it to vUv — the raw gradient otherwise
  // over-refracts x on portrait outputs.
  vec2 nUv = n / aspect;

  // Fogged glass: heavy mip blur everywhere; drops focus to a sharp lens;
  // trails wipe part of the fog clear.
  float focus = mix(BLUR_MAX - c.y, BLUR_MIN, smoothstep(0.1, 0.2, c.x));
  focus = clamp(focus, 0.0, BLUR_MAX);

  vec2 imageUv = coverUv(vUv + nUv, uResolution, uImageResolution);
  vec2 clampedImageUv = clamp(imageUv, vec2(0.001), vec2(0.999));
  vec3 blurred = sampleBackgroundBlurred(uTexture, clampedImageUv);
  vec3 sharp = textureLod(uTexture, clampedImageUv, 0.0).rgb;
  vec3 col = mix(blurred, sharp, 1.0 - focus / BLUR_MAX);

  // UV-locked imprints (watermark, artist mark, …) — locked to the cover-fit
  // image UV (no drop refraction) so they stay proportioned correctly on
  // portrait outputs, and composited before the grade so they receive the
  // same grade/grain as the imagery.
  vec2 cleanImageUv = coverUv(vUv, uResolution, uImageResolution);
  col = applyUvImprints(col, cleanImageUv);

  // Shared brand colour grade — applied to the background BEFORE the cover
  // imprint so the imprint stays ungraded and stands out.
  col = applyColourGrade(col, vUv);

  // Cover imprint — sampled clean (no refraction, no fog) so the ghost
  // keeps its original colours and doesn't pick up the grade.
  vec2 cl = coverLocalUv();
  vec3 cover = textureLod(uCover, clamp(cl, vec2(0.001), vec2(0.999)), 0.0).rgb;
  col = applyCoverImprint(col, cover, cl);

  fragColor = vec4(col, 1.0);
}
`;
