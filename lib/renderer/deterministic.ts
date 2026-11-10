/**
 * lib/renderer/deterministic.ts — seeded PRNG replicating remotion's
 * `random()` exactly (remotion 4.0.431, remotion/dist/cjs/random.js), so the
 * custom renderer produces the same "random" values as the Remotion
 * composition it replaces. Verified by scripts/parity/random-parity.ts.
 */

function mulberry32(a: number): number {
  let t = a + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

/**
 * seededRandom — drop-in replacement for remotion's `random(seed)`.
 * - string seed → mulberry32(hashCode(seed))
 * - number seed → mulberry32(seed * 1e10)
 * - null → Math.random() (same escape hatch as remotion)
 */
export function seededRandom(seed: string | number | null): number {
  if (seed === null) {
    return Math.random();
  }
  if (typeof seed === 'string') {
    return mulberry32(hashCode(seed));
  }
  if (typeof seed === 'number') {
    return mulberry32(seed * 10000000000);
  }
  throw new Error('seededRandom() argument must be a number or a string');
}
