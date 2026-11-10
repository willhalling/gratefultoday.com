/**
 * lib/renderer/timing.ts — dependency-free equivalents of remotion's
 * `interpolate` and `Easing`, matching remotion 4.0.431 semantics (verified
 * bit-for-bit by scripts/parity/timing-parity.ts).
 *
 * Copied from roughclip lib/renderer/timing.ts, then corrected against
 * remotion's actual implementation (remotion/dist/cjs/interpolate.js,
 * bezier.js, easing.js):
 *   - Easing.cubic is t³ (remotion), NOT bezier(0.215, 0.61, 0.355, 1).
 *   - NEWTON_ITERATIONS is 4 (remotion), not 8.
 *   - interpolate resolves the segment first, then applies
 *     extrapolate/clamp/wrap within that segment — remotion's structure, so
 *     multi-segment `wrap` matches exactly.
 *
 * Pure and deterministic: no wall clock, no frame context — everything is an
 * explicit argument.
 */

export type Extrapolate = 'extend' | 'clamp' | 'identity' | 'wrap';
export type EasingFunction = (t: number) => number;

export interface InterpolateOptions {
  extrapolateLeft?: Extrapolate;
  extrapolateRight?: Extrapolate;
  easing?: EasingFunction;
}

// ─── Cubic-bezier solver (remotion/dist/cjs/bezier.js, react-native bezier) ──

const NEWTON_ITERATIONS = 4;
const NEWTON_MIN_SLOPE = 0.001;
const SUBDIVISION_PRECISION = 0.0000001;
const SUBDIVISION_MAX_ITERATIONS = 10;
const SPLINE_TABLE_SIZE = 11;
const SAMPLE_STEP_SIZE = 1.0 / (SPLINE_TABLE_SIZE - 1.0);

function cubicBezier(mX1: number, mY1: number, mX2: number, mY2: number): EasingFunction {
  if (!(mX1 >= 0 && mX1 <= 1 && mX2 >= 0 && mX2 <= 1)) {
    throw new Error('bezier x values must be in [0, 1] range');
  }

  const A = (a1: number, a2: number) => 1.0 - 3.0 * a2 + 3.0 * a1;
  const B = (a1: number, a2: number) => 3.0 * a2 - 6.0 * a1;
  const C = (a1: number) => 3.0 * a1;

  const calcBezier = (t: number, a1: number, a2: number) =>
    ((A(a1, a2) * t + B(a1, a2)) * t + C(a1)) * t;
  const getSlope = (t: number, a1: number, a2: number) =>
    3.0 * A(a1, a2) * t * t + 2.0 * B(a1, a2) * t + C(a1);

  // Precompute the sample table (skipping the endpoints).
  const sampleValues = new Float32Array(SPLINE_TABLE_SIZE);
  if (mX1 !== mY1 || mX2 !== mY2) {
    for (let i = 0; i < SPLINE_TABLE_SIZE; ++i) {
      sampleValues[i] = calcBezier(i * SAMPLE_STEP_SIZE, mX1, mX2);
    }
  }

  const binarySubdivide = (x: number, a: number, b: number): number => {
    let currentX = 0;
    let currentT = 0;
    let i = 0;
    let aa = a;
    let bb = b;
    do {
      currentT = aa + (bb - aa) / 2.0;
      currentX = calcBezier(currentT, mX1, mX2) - x;
      if (currentX > 0.0) {
        bb = currentT;
      } else {
        aa = currentT;
      }
    } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
    return currentT;
  };

  const newtonRaphsonIterate = (x: number, guessT: number): number => {
    let t = guessT;
    for (let i = 0; i < NEWTON_ITERATIONS; ++i) {
      const currentSlope = getSlope(t, mX1, mX2);
      if (currentSlope === 0.0) return t;
      const currentX = calcBezier(t, mX1, mX2) - x;
      t -= currentX / currentSlope;
    }
    return t;
  };

  const getTForX = (x: number): number => {
    let intervalStart = 0.0;
    let currentSample = 1;
    const lastSample = SPLINE_TABLE_SIZE - 1;

    for (
      ;
      currentSample !== lastSample && sampleValues[currentSample] <= x;
      ++currentSample
    ) {
      intervalStart += SAMPLE_STEP_SIZE;
    }
    --currentSample;

    const dist =
      (x - sampleValues[currentSample]) /
      (sampleValues[currentSample + 1] - sampleValues[currentSample]);
    const guessForT = intervalStart + dist * SAMPLE_STEP_SIZE;
    const initialSlope = getSlope(guessForT, mX1, mX2);

    if (initialSlope >= NEWTON_MIN_SLOPE) {
      return newtonRaphsonIterate(x, guessForT);
    }
    if (initialSlope === 0.0) {
      return guessForT;
    }
    return binarySubdivide(x, intervalStart, intervalStart + SAMPLE_STEP_SIZE);
  };

  return (x: number): number => {
    if (mX1 === mY1 && mX2 === mY2) return x; // linear
    // Because JavaScript numbers are imprecise, guarantee the extremes.
    if (x === 0) return 0;
    if (x === 1) return 1;
    return calcBezier(getTForX(x), mY1, mY2);
  };
}

// ─── Easing (remotion/dist/cjs/easing.js) ────────────────────────────────────

export const Easing = {
  linear: (t: number): number => t,
  /** remotion's Easing.quad is the plain quadratic power curve t². */
  quad: (t: number): number => t * t,
  /** remotion's Easing.cubic is the plain cubic power curve t³. */
  cubic: (t: number): number => t * t * t,
  bezier: cubicBezier,
  in: (easing: EasingFunction): EasingFunction => (t: number) => easing(t),
  out:
    (easing: EasingFunction): EasingFunction =>
    (t: number) =>
      1 - easing(1 - t),
  inOut:
    (easing: EasingFunction): EasingFunction =>
    (t: number) => {
      if (t < 0.5) return easing(t * 2) / 2;
      return 1 - easing((1 - t) * 2) / 2;
    },
};

// ─── interpolate (remotion/dist/cjs/interpolate.js) ──────────────────────────

function checkInfiniteRange(name: string, arr: readonly number[]): void {
  if (arr.length < 2) {
    throw new Error(`${name} must have at least 2 elements`);
  }
  for (const element of arr) {
    if (typeof element !== 'number' || !Number.isFinite(element)) {
      throw new Error(`${name} must contain only finite numbers`);
    }
  }
}

function checkValidInputRange(arr: readonly number[]): void {
  for (let i = 1; i < arr.length; ++i) {
    if (!(arr[i] > arr[i - 1])) {
      throw new Error(
        `inputRange must be strictly monotonically increasing but got [${arr.join(',')}]`,
      );
    }
  }
}

function findRange(input: number, inputRange: readonly number[]): number {
  let i = 1;
  for (; i < inputRange.length - 1; ++i) {
    if (inputRange[i] >= input) break;
  }
  return i - 1;
}

function interpolateFunction(
  input: number,
  inputRange: readonly [number, number],
  outputRange: readonly [number, number],
  options: Required<InterpolateOptions>,
): number {
  const { extrapolateLeft, extrapolateRight, easing } = options;
  let result = input;
  const [inputMin, inputMax] = inputRange;
  const [outputMin, outputMax] = outputRange;

  if (result < inputMin) {
    if (extrapolateLeft === 'identity') {
      return result;
    }
    if (extrapolateLeft === 'clamp') {
      result = inputMin;
    } else if (extrapolateLeft === 'wrap') {
      const range = inputMax - inputMin;
      result = ((((result - inputMin) % range) + range) % range) + inputMin;
    }
    // 'extend': noop
  }
  if (result > inputMax) {
    if (extrapolateRight === 'identity') {
      return result;
    }
    if (extrapolateRight === 'clamp') {
      result = inputMax;
    } else if (extrapolateRight === 'wrap') {
      const range = inputMax - inputMin;
      result = ((((result - inputMin) % range) + range) % range) + inputMin;
    }
    // 'extend': noop
  }

  if (outputMin === outputMax) {
    return outputMin;
  }

  result = (result - inputMin) / (inputMax - inputMin);
  result = easing(result);
  result = result * (outputMax - outputMin) + outputMin;
  return result;
}

/**
 * interpolate — remotion-compatible piecewise mapping.
 * Defaults: extrapolateLeft/Right = 'extend', easing = linear.
 */
export function interpolate(
  input: number,
  inputRange: readonly number[],
  outputRange: readonly number[],
  options?: InterpolateOptions,
): number {
  if (inputRange.length !== outputRange.length) {
    throw new Error('inputRange and outputRange must have the same length');
  }
  checkInfiniteRange('inputRange', inputRange);
  checkInfiniteRange('outputRange', outputRange);
  checkValidInputRange(inputRange);

  const easing = options?.easing ?? ((num: number) => num);
  const extrapolateLeft = options?.extrapolateLeft ?? 'extend';
  const extrapolateRight = options?.extrapolateRight ?? 'extend';

  if (typeof input !== 'number') {
    throw new TypeError('Cannot interpolate an input which is not a number');
  }

  const range = findRange(input, inputRange);
  return interpolateFunction(
    input,
    [inputRange[range], inputRange[range + 1]],
    [outputRange[range], outputRange[range + 1]],
    { easing, extrapolateLeft, extrapolateRight },
  );
}

/** Convenience: clamp to [0, 1]. */
export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
