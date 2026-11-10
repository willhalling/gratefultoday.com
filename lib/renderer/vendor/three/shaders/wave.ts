/**
 * wave — shared GLSL for the wavy background effect.
 *
 * Used by both the raw-WebGL `WavyBackgroundScene` (full-screen quad, legacy
 * attribute-based vertex shader) and `CameraMotionScene` (three.js
 * ShaderMaterial on the camera-rig plane). The fragment shader is identical
 * in both; only the vertex stage differs.
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

/** Vertex shader for the raw-WebGL full-screen quad (a_pos in NDC). */
export const WAVE_VERTEX_SHADER_RAW = /* glsl */ `
  attribute vec2 a_pos;
  varying vec2 vUv;
  void main() {
    vUv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

/** Vertex shader for three.js ShaderMaterial (plane geometry `uv`). */
export const WAVE_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Fragment shader. Uniforms:
 *   uTime       — seconds
 *   uWave       — wave amplitude (energy-driven)
 *   uFreq/uSpeed— ripple frequency/speed
 *   uImage      — source texture
 *   uResolution — plane size in pixels (cover-fit target)
 *   uImageRes   — source image pixel size
 */
export const WAVE_FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;
  uniform float     uTime;
  uniform float     uWave;
  uniform float     uFreq;
  uniform float     uSpeed;
  uniform sampler2D uImage;
  uniform vec2      uResolution;
  uniform vec2      uImageRes;
  ${COVER_IMPRINT_UNIFORMS_GLSL}
  ${UV_IMPRINTS_UNIFORMS_GLSL}
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

  ${COVER_IMPRINT_GLSL}
  ${UV_IMPRINTS_GLSL}
  ${COLOUR_GRADE_GLSL}
  ${BLUR_SAMPLE_GLSL}

  void main() {
    vec2 newUV = coverUV(vUv, uResolution, uImageRes);
    // Fluid horizontal ripple — frequency and speed driven by music energy/BPM.
    float waveStrength = 0.0012 + uWave * 0.0045;
    float wave = sin(newUV.y * uFreq + uTime * uSpeed) * waveStrength;
    gl_FragColor = vec4(sampleBackgroundBlurred(uImage, vec2(newUV.x + wave, newUV.y)), 1.0);

    // UV-locked imprints (watermark, artist mark, …) — locked to the
    // cover-fit image UV (before the wave displacement) so they stay
    // proportioned correctly even when the image aspect differs from the
    // output aspect, and composited before the grade so they receive the
    // same grade/grain as the imagery.
    gl_FragColor.rgb = applyUvImprints(gl_FragColor.rgb, newUV);

    // Shared brand colour grade — applied to the background BEFORE the cover
    // imprint so the imprint stays ungraded and stands out.
    gl_FragColor.rgb = applyColourGrade(gl_FragColor.rgb, vUv);

    // Cover imprint — sampled clean (no wave displacement) so the ghost
    // keeps its original colours and doesn't pick up the grade.
    if (uCoverAlpha > 0.001) {
      vec2 cl = coverLocalUv();
      vec3 cover = texture2D(uCover, cl).rgb;
      gl_FragColor.rgb = applyCoverImprint(gl_FragColor.rgb, cover, cl);
    }
  }
`;

/**
 * Cover-fit-only fragment shader (no ripple) — used by CameraMotionScene
 * when the surface effect is 'none' so the plain image still gets correct
 * cover cropping on the rig plane.
 */
export const COVER_FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;
  uniform float     uTime;
  uniform sampler2D uImage;
  uniform vec2      uResolution;
  uniform vec2      uImageRes;
  ${COVER_IMPRINT_UNIFORMS_GLSL}
  ${UV_IMPRINTS_UNIFORMS_GLSL}
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

  ${COVER_IMPRINT_GLSL}
  ${UV_IMPRINTS_GLSL}
  ${COLOUR_GRADE_GLSL}
  ${BLUR_SAMPLE_GLSL}

  void main() {
    vec2 imageUv = coverUV(vUv, uResolution, uImageRes);
    gl_FragColor = vec4(sampleBackgroundBlurred(uImage, imageUv), 1.0);

    // UV-locked imprints (watermark, artist mark, …) — locked to the
    // cover-fit image UV so they stay proportioned correctly on portrait
    // outputs with landscape images, and composited before the grade so
    // they receive the same grade/grain as the imagery.
    gl_FragColor.rgb = applyUvImprints(gl_FragColor.rgb, imageUv);

    // Shared brand colour grade — applied to the background BEFORE the cover
    // imprint so the imprint stays ungraded and stands out.
    gl_FragColor.rgb = applyColourGrade(gl_FragColor.rgb, vUv);

    // Cover imprint — static ghost for the plain camera-motion surface.
    if (uCoverAlpha > 0.001) {
      vec2 cl = coverLocalUv();
      vec3 cover = texture2D(uCover, cl).rgb;
      gl_FragColor.rgb = applyCoverImprint(gl_FragColor.rgb, cover, cl);
    }
  }
`;
