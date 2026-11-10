/**
 * iOS-style liquid glass imprint for the cover art.
 *
 * The cover is treated as a background snapshot. A rounded, lens-shaped
 * distortion is applied inside the imprint box, the image is blurred with a
 * small multi-sample kernel, and a gradient light layer is added so the pane
 * reads as thick, glossy glass.
 */

export interface GlassStyleOptions {
  /** Size of the glass distortion zone (0 = cover edge, 1 = full cover). */
  lensSize?: number;
  /** Strength of the lens distortion. */
  distortion?: number;
  /** Size of the multi-sample blur kernel (radius in pixels). */
  blurRadius?: number;
  /** Intensity of the glossy gradient lighting. */
  lighting?: number;
  /** Overall opacity of the glass layer over the crisp cover. */
  mix?: number;
}

const DEFAULT_GLASS_STYLE: Required<GlassStyleOptions> = {
  lensSize: 0.82,
  distortion: 0.06,
  blurRadius: 3.0,
  lighting: 0.35,
  mix: 0.85,
};

/**
 * Uniform declarations for one liquid-glass imprint slot.
 */
export function glassImprintUniformsGlsl(prefix: string): string {
  return /* glsl */ `
uniform sampler2D u${prefix};
uniform vec4 u${prefix}Rect;
uniform float u${prefix}Alpha;
uniform float u${prefix}GlassLensSize;
uniform float u${prefix}GlassDistortion;
uniform float u${prefix}GlassBlurRadius;
uniform float u${prefix}GlassLighting;
uniform float u${prefix}GlassMix;
`;
}

/**
 * Generate the liquid-glass apply function.
 */
export function glassImprintGlsl(prefix: string): string {
  const localUvFn = `${prefix.charAt(0).toLowerCase()}${prefix.slice(1)}LocalUv`;
  const applyFn = `apply${prefix}Imprint`;

  return /* glsl */ `
#ifndef IMPRINT_SAMPLE
#define IMPRINT_SAMPLE(t, uv) texture2D(t, uv)
#endif

vec2 ${localUvFn}() {
  vec2 screenUv = gl_FragCoord.xy / uResolution;
  return (screenUv - u${prefix}Rect.xy) / u${prefix}Rect.zw;
}

vec3 ${applyFn}(vec3 background, vec3 imprint, vec2 localUv) {
  if (u${prefix}Alpha <= 0.001) return background;

  // Soft-edge mask for the cover box.
  vec2 b = abs(localUv - 0.5) - 0.5;
  float sd = max(b.x, b.y);
  float feather = 0.012;
  float mask = smoothstep(feather, -feather, sd) * u${prefix}Alpha;

  // Normalised coordinates inside the cover, corrected for aspect ratio.
  vec2 p = (localUv - 0.5) * 2.0;
  p.x *= u${prefix}Rect.z / max(u${prefix}Rect.w, 0.0001);

  // Rounded-box "squircle" distance, like an iOS app icon.
  float power = 6.0;
  float roundedBox = pow(abs(p.x), power) + pow(abs(p.y), power);

  // Three-layer mask for a smooth transition from crisp cover → glass edge.
  float size = u${prefix}GlassLensSize;
  float m1 = 10000.0 / (size * size);
  float m2 = 9500.0 / (size * size);
  float m3 = 11000.0 / (size * size);

  float rb1 = clamp((1.0 - roundedBox * m1) * 8.0, 0.0, 1.0);
  float rb2 = clamp((0.95 - roundedBox * m2) * 16.0, 0.0, 1.0)
            - clamp(pow(0.9 - roundedBox * m2, 1.0) * 16.0, 0.0, 1.0);
  float rb3 = clamp((1.5 - roundedBox * m3) * 2.0, 0.0, 1.0)
            - clamp((1.0 - roundedBox * m3) * 2.0, 0.0, 1.0);

  float transition = smoothstep(0.0, 1.0, rb1 + rb2);

  // Lens distortion: pull UVs toward the centre near the middle of the pane.
  float lensStrength = u${prefix}GlassDistortion * (1.0 - roundedBox * 5000.0);
  vec2 lensUv = (localUv - 0.5) * (1.0 - lensStrength) + 0.5;

  // Multi-sample blur at the distorted UV.
  float sampleRange = u${prefix}GlassBlurRadius;
  float sampleOffset = 0.5 / max(u${prefix}Rect.z, u${prefix}Rect.w);

  vec3 blurred = vec3(0.0);
  float total = 0.0;
  for (float x = -sampleRange; x <= sampleRange; x += 1.0) {
    for (float y = -sampleRange; y <= sampleRange; y += 1.0) {
      vec2 off = vec2(x, y) * sampleOffset;
      blurred += IMPRINT_SAMPLE(u${prefix}, clamp(lensUv + off, vec2(0.001), vec2(0.999))).rgb;
      total += 1.0;
    }
  }
  blurred /= total;

  // Gradient lighting — top-lit sheen that follows the cover surface.
  float gradient = clamp((clamp(p.y, 0.0, 0.2) + 0.1) * 0.5, 0.0, 1.0)
                 + clamp((clamp(-p.y, -1000.0, 0.2) * rb3 + 0.1) * 0.5, 0.0, 1.0);
  vec3 lighting = clamp(blurred + vec3(rb1) * gradient + vec3(rb2) * u${prefix}GlassLighting, 0.0, 1.0);

  // Mix between the crisp cover and the liquid-glass layer.
  vec3 glassColor = mix(imprint, lighting, transition * u${prefix}GlassMix);

  return mix(background, glassColor, mask);
}
`;
}

/**
 * Default liquid-glass style uniforms for the React side.
 */
export function defaultGlassStyleUniforms(
  options: GlassStyleOptions = {},
): Record<string, number> {
  const style = { ...DEFAULT_GLASS_STYLE, ...options };
  return {
    GlassLensSize: style.lensSize,
    GlassDistortion: style.distortion,
    GlassBlurRadius: style.blurRadius,
    GlassLighting: style.lighting,
    GlassMix: style.mix,
  };
}
