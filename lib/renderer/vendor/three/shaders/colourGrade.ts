/**
 * Colour grade shaders — cinematic colour grading that maps the image's
 * tonal range onto the video's three brand colours.
 *
 * The grading math itself lives in the shared ../colourGrade module
 * (COLOUR_GRADE_GLSL / COLOUR_GRADE_UNIFORMS_GLSL), the same utility the
 * other atmospheres apply at the end of their fragment shaders. This
 * atmosphere is that grade as a standalone effect: sample the image,
 * composite the cover imprint, grade.
 *
 * The brand colours are passed as uniforms so the grade always matches the
 * current theme — no hard-coded palette.
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

export const COLOUR_GRADE_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const COLOUR_GRADE_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform vec2 uImageResolution;
${COVER_IMPRINT_UNIFORMS_GLSL}
${UV_IMPRINTS_UNIFORMS_GLSL}
${COLOUR_GRADE_UNIFORMS_GLSL}
${BLUR_SAMPLE_UNIFORMS_GLSL}

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

${COVER_IMPRINT_GLSL}
${UV_IMPRINTS_GLSL}
${COLOUR_GRADE_GLSL}
${BLUR_SAMPLE_GLSL}

void main() {
  vec2 imageUv = coverUv(clamp(vUv, vec2(0.001), vec2(0.999)), uResolution, uImageResolution);
  vec3 col = sampleBackgroundBlurred(uTexture, imageUv);

  // UV-locked imprints (watermark, artist mark, …) — composited before the
  // grade so they receive the same grade/grain as the imagery and travel
  // with the image content under camera motion.
  vec2 cleanImageUv = coverUv(vUv, uResolution, uImageResolution);
  col = applyUvImprints(col, cleanImageUv);

  // Grade the background first so the imprint stays ungraded and stands out.
  col = applyColourGrade(col, vUv);

  // Cover imprint — composited after grading so the ghost stays ungraded.
  vec2 cl = coverLocalUv();
  vec3 cover = texture2D(uCover, clamp(cl, vec2(0.001), vec2(0.999))).rgb;
  col = applyCoverImprint(col, cover, cl);

  gl_FragColor = vec4(col, 1.0);
}
`;
