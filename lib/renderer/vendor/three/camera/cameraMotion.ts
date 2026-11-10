/**
 * cameraMotion — pure pose math for the camera-motion system.
 *
 * Camera motion is a *separate* layer from the background motion effects
 * (wave / pulse / liquid-glass / rgb-glitch). The effects deform the image
 * plane's surface; the camera rig moves the perspective camera looking at
 * that plane, so the two compose like a cinematographer moving a real
 * camera in front of a treated backdrop.
 *
 * All poses are pure functions of the frame — deterministic for Remotion
 * rendering and velocity-continuous by construction (linear ramps and slow
 * sines only — the cosine-continuity principle from DepthGalleryBackground,
 * deliberately far more restrained and never beat-synced).
 */

export type CameraMotion =
  | 'static'
  | 'push-in'
  | 'pull-back'
  | 'drift-left'
  | 'drift-right'
  | 'vertical-float'
  | 'diagonal-drift'
  | 'orbit'
  | 'breathing';

/**
 * Movement family of a camera style. Used by tag-based pickers to select
 * camera motions by character instead of
 * hardcoded ids.
 *   still — no movement   zoom — in/out breathing   pan — lateral trucking
 *   float — vertical/diagonal drifting   orbit — slow circular parallax
 */
export type CameraMotionFamily = 'still' | 'zoom' | 'pan' | 'float' | 'orbit';

export const CAMERA_MOTION_OPTIONS: {
  value: CameraMotion;
  label: string;
  /** Movement family tag — see CameraMotionFamily. */
  family?: CameraMotionFamily;
}[] = [
  { value: 'static', label: 'Static', family: 'still' },
  { value: 'push-in', label: 'Push In & Out', family: 'zoom' },
  { value: 'pull-back', label: 'Pull Back & In', family: 'zoom' },
  { value: 'drift-left', label: 'Drift Left & Right', family: 'pan' },
  { value: 'drift-right', label: 'Drift Right & Left', family: 'pan' },
  { value: 'vertical-float', label: 'Vertical Float', family: 'float' },
  { value: 'diagonal-drift', label: 'Diagonal Drift', family: 'float' },
  { value: 'orbit', label: 'Gentle Orbit', family: 'orbit' },
  { value: 'breathing', label: 'Breathing', family: 'zoom' },
];

/**
 * Camera intensity — scales every pose offset (zoom deviation, translation,
 * roll) without changing the style's character. Independent of the
 * background motion effect's intensity.
 *
 * Continuous 0–1 slider with a wide, non-linear range so "Subtle" and "Strong"
 * feel meaningfully different. 0.5 lands on: push ~6 %, drift ±3 % (6 % travel),
 * float ±3 %. At 0 the motion is barely visible; at 1 it's roughly 3× stronger.
 */
export type CameraMotionIntensity = number;

/** Maps a 0–1 slider value to the pose scale factor. Quadratic curve so the
 *  low end is very gentle and the high end is dramatic. */
export function cameraIntensityScale(intensity: number): number {
  return 0.25 + intensity * intensity * 2.75; // 0 → 0.25, 0.5 → 0.94, 1 → 3.0
}

/** Legacy discrete intensity values stored before the 0–1 refactor. */
export type LegacyCameraMotionIntensity = 'subtle' | 'balanced' | 'intense';

/** Backward-compatible mapping from legacy discrete values to 0–1. */
export function cameraIntensityFromLegacy(value: LegacyCameraMotionIntensity): number {
  switch (value) {
    case 'subtle':
      return 0;
    case 'balanced':
      return 0.5;
    case 'intense':
      return 1;
  }
}

/**
 * Normalizes a stored intensity (continuous 0–1 or a legacy discrete string)
 * to a 0–1 number. `undefined` passes through so callers can apply defaults.
 */
export function normalizeCameraIntensity(
  value: CameraMotionIntensity | LegacyCameraMotionIntensity | undefined | null,
): CameraMotionIntensity | undefined {
  if (value == null) return undefined;
  return typeof value === 'number' ? value : cameraIntensityFromLegacy(value);
}

/** Perspective-camera field of view for the rig. */
export const RIG_FOV = 40;

/**
 * Plane oversize factor applied whenever the rig is active so drift/orbit
 * poses never reveal the plane's edges (max drift is ±5 % of width plus a
 * ≤0.5° roll — 30 % total margin covers both with room to spare).
 */
export const RIG_PLANE_MARGIN = 1.30;

/** Camera distance at rest pose: plane of `height` exactly fills the frame. */
export function getRestCameraZ(height: number): number {
  const halfFov = (RIG_FOV * Math.PI) / 180 / 2;
  return height / 2 / Math.tan(halfFov);
}

export interface CameraPose {
  /** Horizontal offset in plane units (== output pixels at rest pose). */
  x: number;
  /** Vertical offset in plane units. */
  y: number;
  /** Zoom factor — camera distance is restZ / zoom. 1 = rest framing. */
  zoom: number;
  /** Roll in radians. */
  rotationZ: number;
}

const REST_POSE: CameraPose = { x: 0, y: 0, zoom: 1, rotationZ: 0 };

/** Slow oscillation periods (seconds) — long, and never beat-synced. */
const FLOAT_PERIOD_SEC = 14;
const ORBIT_PERIOD_SEC = 22;
const BREATHING_PERIOD_SEC = 9;
const PUSH_PULL_PERIOD_SEC = 24;
const DRIFT_PERIOD_SEC = 26;
const DIAGONAL_PERIOD_SEC = 30;

const TWO_PI = Math.PI * 2;

/**
 * Camera pose for a style at normalized progress `t` (0→1 across the whole
 * song) and absolute `timeSec`, scaled by `intensity`. Styles oscillate slowly
 * so the artwork never drifts out of frame by the end of the clip. Balanced
 * ranges: push/pull zoom ~±6%, drift ±3% of the frame width (6% total travel),
 * float ±3% of the frame height, roll within 0.5°.
 */
export function getCameraPose(
  style: CameraMotion,
  t: number,
  timeSec: number,
  width: number,
  height: number,
  intensity: CameraMotionIntensity = 0.5,
): CameraPose {
  const progress = Math.max(0, Math.min(1, t));
  const s = cameraIntensityScale(intensity);

  switch (style) {
    case 'push-in': {
      // Gentle in-and-out: never loses the artwork at the end of the song.
      const phase = Math.sin((timeSec / PUSH_PULL_PERIOD_SEC) * TWO_PI);
      return { ...REST_POSE, zoom: 1 + 0.06 * s * (0.5 + 0.5 * phase) };
    }
    case 'pull-back': {
      const phase = Math.sin((timeSec / PUSH_PULL_PERIOD_SEC) * TWO_PI);
      return { ...REST_POSE, zoom: 1 - 0.06 * s * (0.5 + 0.5 * phase) };
    }
    case 'drift-left': {
      // Camera trucks side-to-side so the image appears to drift left, then
      // returns — artwork stays in frame the whole time.
      const phase = Math.cos((timeSec / DRIFT_PERIOD_SEC) * TWO_PI);
      return { ...REST_POSE, x: width * 0.022 * s * phase };
    }
    case 'drift-right': {
      const phase = Math.cos((timeSec / DRIFT_PERIOD_SEC) * TWO_PI);
      return { ...REST_POSE, x: width * 0.022 * s * -phase };
    }
    case 'vertical-float':
      return {
        ...REST_POSE,
        y: height * 0.022 * s * Math.sin((timeSec / FLOAT_PERIOD_SEC) * TWO_PI),
      };
    case 'diagonal-drift': {
      const phase = Math.sin((timeSec / DIAGONAL_PERIOD_SEC) * TWO_PI);
      return {
        ...REST_POSE,
        x: width * 0.022 * s * phase,
        y: height * 0.016 * s * Math.cos((timeSec / DIAGONAL_PERIOD_SEC) * TWO_PI),
      };
    }
    case 'orbit': {
      // Flat plane ⇒ roll + small circular translation (parallax feel)
      // instead of yaw, which would keystone-distort the image.
      const angle = (timeSec / ORBIT_PERIOD_SEC) * TWO_PI;
      const radius = height * 0.012 * s;
      return {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
        zoom: 1,
        rotationZ: ((0.5 * Math.PI) / 180) * s * Math.sin(angle),
      };
    }
    case 'breathing': {
      const phase = Math.sin((timeSec / BREATHING_PERIOD_SEC) * TWO_PI);
      return { ...REST_POSE, zoom: 1 + 0.03 * s * (0.5 + 0.5 * phase) };
    }
    case 'static':
    default:
      return REST_POSE;
  }
}
