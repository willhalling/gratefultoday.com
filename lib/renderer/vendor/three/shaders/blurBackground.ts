/**
 * blurBackground — reusable GLSL for a blurred, grained full-screen background.
 *
 * Used by BlurredBackgroundScene as the base background layer. Supports both
 * image and gradient inputs (the gradient is pre-baked to a texture by the
 * caller). The shader performs a two-pass separable Gaussian blur controlled by
 * uBlur (0 = sharp, 1 = heavy) and adds animated film grain via uGrain.
 */

export const BLUR_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** Cover-fit UV so any source aspect ratio fills the output frame. */
const COVER_FIT_GLSL = /* glsl */ `
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
`;

/** Hash for grain. */
const GRAIN_HASH_GLSL = /* glsl */ `
  float grainHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
`;

/**
 * Fragment shader for the horizontal blur pass.
 * uBlurRadius is in pixels (max controlled by caller).
 *
 * 9-tap Gaussian kernel (sigma = radius) with offsets at 0, ±0.25, ±0.5, ±0.75,
 * ±1.0 times the radius. More samples = a much softer, more photographic blur
 * than the old 5-tap approximation.
 */
export const BLUR_HORIZONTAL_FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform vec2 uImageRes;
  uniform float uBlurRadius;

  ${COVER_FIT_GLSL}

  void main() {
    vec2 imageUv = coverUV(vUv, uResolution, uImageRes);
    vec2 off = vec2(uBlurRadius / uResolution.x, 0.0);

    vec4 c = texture2D(uTexture, imageUv) * 0.13466;
    c += texture2D(uTexture, imageUv + off * 0.25) * 0.13055;
    c += texture2D(uTexture, imageUv - off * 0.25) * 0.13055;
    c += texture2D(uTexture, imageUv + off * 0.50) * 0.11883;
    c += texture2D(uTexture, imageUv - off * 0.50) * 0.11883;
    c += texture2D(uTexture, imageUv + off * 0.75) * 0.10165;
    c += texture2D(uTexture, imageUv - off * 0.75) * 0.10165;
    c += texture2D(uTexture, imageUv + off * 1.00) * 0.08168;
    c += texture2D(uTexture, imageUv - off * 1.00) * 0.08168;

    gl_FragColor = c;
  }
`;

/** Fragment shader for the vertical blur pass + grain + grade. */
export const BLUR_VERTICAL_FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform float uBlurRadius;
  uniform float uGrain;
  uniform float uTime;
  uniform float uDarkness;
  uniform float uSaturation;

  ${GRAIN_HASH_GLSL}

  void main() {
    vec2 off = vec2(0.0, uBlurRadius / uResolution.y);

    vec4 c = texture2D(uTexture, vUv) * 0.13466;
    c += texture2D(uTexture, vUv + off * 0.25) * 0.13055;
    c += texture2D(uTexture, vUv - off * 0.25) * 0.13055;
    c += texture2D(uTexture, vUv + off * 0.50) * 0.11883;
    c += texture2D(uTexture, vUv - off * 0.50) * 0.11883;
    c += texture2D(uTexture, vUv + off * 0.75) * 0.10165;
    c += texture2D(uTexture, vUv - off * 0.75) * 0.10165;
    c += texture2D(uTexture, vUv + off * 1.00) * 0.08168;
    c += texture2D(uTexture, vUv - off * 1.00) * 0.08168;

    // Darken so the central artwork stays the focal point.
    c.rgb *= (1.0 - uDarkness * 0.5);

    // Saturation tweak.
    float luma = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    c.rgb = mix(vec3(luma), c.rgb, uSaturation);

    // Animated film grain.
    if (uGrain > 0.001) {
      float g = grainHash(vUv * uResolution + uTime * 120.0);
      g = mix(-1.0, 1.0, g);
      c.rgb += g * uGrain * 0.08;
    }

    gl_FragColor = c;
  }
`;

/** Max blur radius in pixels at `uBackgroundBlur = 1`. Tune this one value. */
export const MAX_BACKGROUND_BLUR_RADIUS = 56.0;

/**
 * Reusable single-pass blur for atmosphere shaders. Call this after cover-fitting
 * the UV. `blur` is 0–1 and maps to `MAX_BACKGROUND_BLUR_RADIUS` px. A 12-tap
 * Poisson disk with Gaussian distance weights replaces the old flat-weighted
 * kernel so the blur falls off organically instead of looking like a hard disk.
 */
export const BLUR_SAMPLE_GLSL = /* glsl */ `
  #ifndef WC_BACKGROUND_BLUR_SAMPLE
  #define WC_BACKGROUND_BLUR_SAMPLE

  #if __VERSION__ >= 300
    #define WC_SAMPLE_TEXTURE texture
  #else
    #define WC_SAMPLE_TEXTURE texture2D
  #endif

  vec3 sampleBackgroundBlurred(sampler2D tex, vec2 uv) {
    if (uBackgroundBlur < 0.001) return WC_SAMPLE_TEXTURE(tex, uv).rgb;

    float radius = uBackgroundBlur * ${MAX_BACKGROUND_BLUR_RADIUS.toFixed(1)};
    vec2 scale = radius / uBlurResolution;

    // 12-tap Poisson disk with Gaussian falloff. The previous equal-weight disk
    // looked like a translucent coin; these weights give a soft, natural falloff.
    vec3 c = WC_SAMPLE_TEXTURE(tex, uv).rgb * 0.2256;
    c += WC_SAMPLE_TEXTURE(tex, uv + vec2(-0.326212, -0.40581) * scale).rgb * 0.1311;
    c += WC_SAMPLE_TEXTURE(tex, uv + vec2(-0.840144, -0.07358) * scale).rgb * 0.0544;
    c += WC_SAMPLE_TEXTURE(tex, uv + vec2(-0.695914, 0.457137) * scale).rgb * 0.0564;
    c += WC_SAMPLE_TEXTURE(tex, uv + vec2(-0.203345, 0.620716) * scale).rgb * 0.0961;
    c += WC_SAMPLE_TEXTURE(tex, uv + vec2(0.96234, -0.194983) * scale).rgb * 0.0328;
    c += WC_SAMPLE_TEXTURE(tex, uv + vec2(0.473434, -0.480026) * scale).rgb * 0.0909;
    c += WC_SAMPLE_TEXTURE(tex, uv + vec2(0.519456, 0.767022) * scale).rgb * 0.0406;
    c += WC_SAMPLE_TEXTURE(tex, uv + vec2(0.185461, -0.893124) * scale).rgb * 0.0427;
    c += WC_SAMPLE_TEXTURE(tex, uv + vec2(0.507431, 0.064425) * scale).rgb * 0.1336;
    c += WC_SAMPLE_TEXTURE(tex, uv + vec2(0.89642, 0.412458) * scale).rgb * 0.0322;
    c += WC_SAMPLE_TEXTURE(tex, uv + vec2(-0.32194, -0.932615) * scale).rgb * 0.0323;
    c += WC_SAMPLE_TEXTURE(tex, uv + vec2(-0.791559, -0.59771) * scale).rgb * 0.0316;

    // Slight darken so blurred artwork doesn't compete with the cover.
    c *= (1.0 - uBackgroundBlur * 0.2);
    return c;
  }
  #endif
`;

/** Uniforms string for the reusable blur function. */
export const BLUR_SAMPLE_UNIFORMS_GLSL = /* glsl */ `
  #ifndef WC_BACKGROUND_BLUR_UNIFORMS
  #define WC_BACKGROUND_BLUR_UNIFORMS
  uniform float uBackgroundBlur;
  uniform vec2 uBlurResolution;
  #endif
`;

/** Tunables for the blur scene. */
export const BLUR_BACKGROUND_SETTINGS = {
  /** Maximum blur radius in pixels at uBlur = 1. */
  maxBlurRadius: MAX_BACKGROUND_BLUR_RADIUS,
  /** Default grain amount. */
  defaultGrain: 1.0,
  /** Default darkness multiplier (0 = none, 1 = strong). */
  defaultDarkness: 0.35,
  /** Default saturation multiplier (1 = unchanged). */
  defaultSaturation: 1.1,
};
