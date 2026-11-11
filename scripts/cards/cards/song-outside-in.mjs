/**
 * Song card, "outside, in" — you hear their song through the wall from the
 * foggy street, walk up to the house, and the door opens into the room where
 * it's playing. At the end you leave, and it's behind the wall again.
 *
 * The trick is one song played twice: once muffled (treble cut, in the
 * modelled living room), once clean, crossfaded at the door.
 *
 * The song is the MiniMax test song (scripts/experiments/song-test.mjs); the
 * lyric lines are timed from its transcription. Street and house are from the
 * fog set; the room and Mum are the images already made for magic-mum.
 */
import { join } from 'node:path';
import { MEDIA } from '../engine.mjs';
import mum from './magic-mum.mjs';

const FOG = '/Users/will/Documents/wavecanvas-christmas/public/dev-media/christmas/live';
const SONG = join(MEDIA, 'song-test', 'minimax-phonetic.mp3');
/** A shot borrowed from another card, with that card's default style and look, so the cached image is reused. */
const from = (card, name) => {
  const s = card.shots.find((x) => x.name === name);
  return { ...s, style: s.style ?? card.style, look: s.look === undefined ? card.look : s.look };
};

// Shot starts, to place the sung lines (each shot starts where the last ended, minus its dissolve).
const START = { street: 0, house: 6, room: 17.5, mum: 23.9, leave: 38.9 };
const DOOR_IN = 17.6;
const DOOR_OUT = 41.2;

/** A sung line, on screen from just before it starts until `to` (song time). */
const line = (shot, start, to, lines, y, scrim = true) => ({ type: 'letter', lines, y, at: +(start - 0.3 - START[shot]).toFixed(2), for: +(to - start + 0.3).toFixed(2), fin: 0.5, fout: 0.4, scrim });

export default {
  id: 'song-outside-in',
  title: 'Song card: outside, in',
  fadeOut: 3,
  wideDynamics: true,
  shots: [
    {
      name: 'street',
      len: 7.2,
      file: join(FOG, 'memory_07.jpg'),
      move: { from: 1.0, to: 1.07, focal: [0.5, 0.6] },
      text: [{ type: 'cinematic', lines: ['Somebody wrote you', 'a Christmas song.'], y: 0.3, at: 0, for: 6.2 }],
    },
    {
      name: 'house',
      len: 12.7,
      file: join(FOG, 'memory_08.jpg'),
      move: { from: 1.02, to: 1.12, focal: [0.356, 0.765] },
      glow: 1.6,
      text: [
        // Heard through the wall, so the words are there to follow.
        line('house', 12.45, 15.1, ['You burn the sprouts', 'every year, Mum'], 0.58, false),
        line('house', 15.29, 17.5, ['And swear the oven’s', 'to blame'], 0.58, false),
      ],
    },
    {
      ...from(mum, 'morning'),
      name: 'room',
      len: 7.7,
      text: [line('room', 17.77, 21.4, ['You fall asleep', 'before the film is done'], 0.72), line('room', 21.55, 24.0, ['And we love you', 'just the same'], 0.72)],
    },
    {
      ...from(mum, 'mum'),
      name: 'mum',
      len: 16.3,
      dissolve: 1.3,
      text: [
        line('mum', 24.25, 28.8, ['Merry Christmas, Mum,', 'from all of us'], 0.72),
        line('mum', 29.01, 31.6, ['The magic was', 'always you'], 0.72),
        line('mum', 31.89, 35.7, ['Merry Christmas, Mum,', 'from Siobhan and Niamh'], 0.72),
        line('mum', 36.01, 38.3, ['We’d be lost', 'without you'], 0.72),
      ],
    },
    {
      name: 'leave',
      len: 13.6,
      dissolve: 1.3,
      file: join(FOG, 'memory_08.jpg'),
      move: { from: 1.3, to: 1.0, focal: [0.356, 0.765] },
      text: [{ type: 'cinematic', lines: ['Say it', 'in a song.'], y: 0.3, at: 5.2, fin: 1.6 }],
    },
  ],
  sound: [
    // Cold outside; gone when the door shuts behind you; back when you leave.
    { kind: 'wind', env: [[0, 0.45], [DOOR_IN - 0.2, 0.45], [DOOR_IN + 0.8, 0.02], [DOOR_OUT - 0.2, 0.02], [DOOR_OUT + 1.2, 0.4]] },
    // The song through the wall: nearer and louder as you walk up to the house.
    { kind: 'file', file: SONG, highpass: 140, lowpass: 650, room: 'living-room', roomMix: [6, 10], env: [[0, 0.22], [6, 0.3], [DOOR_IN - 0.2, 0.55], [DOOR_IN + 0.7, 0], [DOOR_OUT - 0.2, 0], [DOOR_OUT + 0.9, 0.5], ['end', 0.3]] },
    // The song in the room.
    { kind: 'file', file: SONG, env: [[DOOR_IN - 0.2, 0], [DOOR_IN + 0.8, 0.95], [DOOR_OUT - 0.2, 0.95], [DOOR_OUT + 0.9, 0]] },
    { kind: 'door', at: DOOR_IN, level: 0.5 },
    { kind: 'door', at: DOOR_OUT + 0.5, level: 0.4 },
    { kind: 'room', env: [[DOOR_IN, 0], [DOOR_IN + 1, 0.08], [DOOR_OUT, 0.08], [DOOR_OUT + 1, 0]] },
  ],
};
