/**
 * cards/music-box — a small synthesised music box playing traditional carols
 * (the tunes are out of copyright, and this is our own recording of them, so
 * there's nothing to license). Writes a 48 kHz stereo WAV, cached per tune
 * and tempo.
 *
 * To add a tune: notes as [name, beats] (null = rest), one bass note per bar.
 */
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SR = 48000;
const SEMITONE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const freq = (name) => {
  const m = /^([A-G]#?)(\d)$/.exec(name);
  return 440 * 2 ** ((12 * (+m[2] + 1) + SEMITONE[m[1]] - 69) / 12);
};

export const TUNES = {
  /** Silent Night (Gruber, 1818), in C, 3/4. Slow and tender. */
  'silent-night': {
    bpm: 84,
    beatsPerBar: 3,
    notes: [
      ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
      ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
      ['D5', 2], ['D5', 1], ['B4', 3],
      ['C5', 2], ['C5', 1], ['G4', 3],
      ['A4', 2], ['A4', 1], ['C5', 1.5], ['B4', 0.5], ['A4', 1],
      ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
      ['A4', 2], ['A4', 1], ['C5', 1.5], ['B4', 0.5], ['A4', 1],
      ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
      ['D5', 2], ['D5', 1], ['F5', 1.5], ['D5', 0.5], ['B4', 1],
      ['C5', 3], ['E5', 3],
      ['C5', 1], ['G4', 1], ['E4', 1], ['G4', 1.5], ['F4', 0.5], ['D4', 1],
      ['C4', 6],
    ],
    bass: ['C3', 'C3', 'C3', 'C3', 'G2', 'G2', 'C3', 'C3', 'F2', 'F2', 'C3', 'C3', 'F2', 'F2', 'C3', 'C3', 'G2', 'G2', 'C3', 'C3', 'C3', 'G2', 'C3', 'C3'],
  },
  /** We Wish You a Merry Christmas (traditional), in G, 3/4 with a one-beat pickup. Light and playful. */
  'we-wish': {
    bpm: 112,
    beatsPerBar: 3,
    pickup: 1,
    notes: [
      ['D4', 1],
      ['G4', 1], ['G4', 0.5], ['A4', 0.5], ['G4', 0.5], ['F#4', 0.5],
      ['E4', 1], ['E4', 1], ['E4', 1],
      ['A4', 1], ['A4', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 0.5],
      ['F#4', 1], ['D4', 1], ['D4', 1],
      ['B4', 1], ['B4', 0.5], ['C5', 0.5], ['B4', 0.5], ['A4', 0.5],
      ['G4', 1], ['E4', 1], ['D4', 0.5], ['D4', 0.5],
      ['E4', 1], ['A4', 1], ['F#4', 1],
      ['G4', 3],
    ],
    bass: ['G2', 'C3', 'A2', 'D3', 'B2', 'C3', 'D3', 'G2'],
    /** Play it this many times through (it's short). */
    repeat: 3,
  },
};

/** @returns {string} path to the WAV */
export function musicBox(tune, { bpm } = {}, dir) {
  const def = TUNES[tune];
  if (!def) throw new Error(`No tune "${tune}". Have: ${Object.keys(TUNES).join(', ')}`);
  const tempo = bpm ?? def.bpm;
  const file = join(dir, `musicbox-${tune}-${tempo}.wav`);
  if (existsSync(file)) return file;

  const beat = 60 / tempo;
  const events = [];
  let t = 0.05;
  for (let r = 0; r < (def.repeat ?? 1); r++) {
    const first = t + (def.pickup ?? 0) * beat;
    for (const [n, d] of def.notes) {
      // The comb plays an octave above the written tune.
      if (n) events.push({ f: freq(n) * 2, t, amp: 1, tau: 1.25 });
      t += d * beat;
    }
    def.bass.forEach((n, i) => events.push({ f: freq(n) * 2, t: first + i * def.beatsPerBar * beat, amp: 0.42, tau: 1.9 }));
    // Line the next pass's pickup up with the end of the last bar.
    if (def.pickup && r < (def.repeat ?? 1) - 1) t -= def.pickup * beat;
  }

  const len = Math.ceil((t + 4) * SR);
  const L = new Float32Array(len);
  const R = new Float32Array(len);
  for (const e of events) {
    const start = Math.round(e.t * SR);
    const dur = Math.min(len - start, Math.round(e.tau * 6 * SR));
    const pan = 0.5 + 0.22 * Math.sin(e.f / 170); // spread the tines a little, the same way every time
    const w = 2 * Math.PI * e.f;
    for (let i = 0; i < dur; i++) {
      const x = i / SR;
      const s =
        Math.min(1, x / 0.002) *
        e.amp *
        (Math.sin(w * x) * Math.exp(-x / e.tau) +
          0.35 * Math.sin(2 * w * x) * Math.exp(-x / (e.tau * 0.6)) +
          0.12 * Math.sin(3.01 * w * x) * Math.exp(-x / (e.tau * 0.35)) +
          0.08 * Math.sin(5.4 * w * x) * Math.exp(-x / 0.06)); // the pluck
      L[start + i] += s * (1 - pan);
      R[start + i] += s * pan;
    }
  }
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = 0.6 / peak;
  const b = Buffer.alloc(44 + len * 4);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + len * 4, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(2, 22);
  b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 4, 28);
  b.writeUInt16LE(4, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(len * 4, 40);
  for (let i = 0; i < len; i++) {
    b.writeInt16LE(Math.round(L[i] * g * 32767), 44 + i * 4);
    b.writeInt16LE(Math.round(R[i] * g * 32767), 46 + i * 4);
  }
  writeFileSync(file, b);
  return file;
}
