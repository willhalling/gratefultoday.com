/**
 * Song card, "carol singers" — a knock at the door. From the hallway you hear
 * singing outside, muffled through the front door; you open it, and someone is
 * on the doorstep singing a song written for you. Then Mum, listening in her
 * doorway; then the whole scene from across the street.
 *
 * Three ways of hearing one song: through the door (treble cut, in the
 * modelled hallway), on the doorstep (clean), from the street (softer, duller).
 *
 * The song is the MiniMax test song (scripts/experiments/song-test.mjs); the
 * lyric lines are timed from its transcription.
 */
import { join } from 'node:path';
import { FOG_REF, MEDIA } from '../engine.mjs';

const SONG = join(MEDIA, 'song-test', 'minimax-phonetic.mp3');

// Shot starts, to place the sung lines (each shot starts where the last ended, minus its dissolve).
const START = { hall: 0, glass: 7, singer: 12.2, mum: 23.9, street: 38.9 };
const DOOR = 12.2; // just before the first sung line
const STEP_BACK = 39.6; // out to the street for the last "Merry Christmas, Mum"

/** A sung line, on screen from just before it starts until `to` (song time). */
const line = (shot, start, to, lines, y = 0.72) => ({ type: 'letter', lines, y, at: +(start - 0.3 - START[shot]).toFixed(2), for: +(to - start + 0.3).toFixed(2), fin: 0.5, fout: 0.4, scrim: true });

export default {
  id: 'song-carol-singers',
  title: 'Song card: carol singers',
  style: 'warmNow',
  look: 'soft',
  fadeOut: 3,
  wideDynamics: true,
  subjects: { mum: 'a British grandmother aged about seventy-two with short natural white hair, glasses and deep laugh lines, wearing a plain red round-neck jumper' },
  shots: [
    {
      name: 'hall',
      len: 8.2,
      prompt:
        'View from inside the dim hallway of a British terraced house on Christmas Eve, looking at the closed front door. The door has a large panel of heavily frosted obscure glass, glowing amber from lanterns outside. Through the frosted glass, three people facing the door are visible only as vague, soft, dark blurred silhouettes with no detail at all. Coats on hooks, fairy lights round the door frame, a doormat.',
      move: { from: 1.0, to: 1.08, focal: [0.5, 0.5] },
      text: [{ type: 'cinematic', lines: ['There’s someone', 'at the door.'], y: 0.68, at: 0, for: 6.6 }],
    },
    {
      name: 'glass',
      len: 6.4,
      glow: 1.4,
      prompt:
        'Close-up from inside of the frosted patterned glass panel of a front door at night. Just outside, the soft blurred silhouettes of carol singers holding glowing lanterns, their shapes diffused by the glass. Warm lantern light and cold blue night mixing in the glass.',
      move: { from: 1.0, to: 1.12, focal: [0.5, 0.5] },
      text: [{ type: 'caption', lines: ['Christmas Eve'], y: 0.74, at: 1.0, for: 3.6, scrim: true }],
    },
    {
      name: 'singer',
      len: 12.9,
      style: 'winterDoorstep',
      prompt:
        'A young woman carol singer with an acoustic guitar standing on a front doorstep, singing with her mouth open mid-song, wearing a woolly hat and a long scarf. Two friends just behind her hold lanterns and song sheets, softly out of focus. Seen from the open doorway, lit by the warm light from the hall.',
      move: { from: 1.0, to: 1.08, focal: [0.5, 0.4] },
      text: [
        line('singer', 12.45, 15.1, ['You burn the sprouts', 'every year, Mum']),
        line('singer', 15.29, 17.5, ['And swear the oven’s', 'to blame']),
        line('singer', 17.77, 21.4, ['You fall asleep', 'before the film is done']),
        line('singer', 21.55, 24.0, ['And we love you', 'just the same']),
      ],
    },
    {
      name: 'mum',
      len: 16.3,
      style: 'winterDoorstep',
      prompt:
        'Portrait of {mum} standing in her open front doorway, seen from the doorstep, one hand pressed to her chest, eyes shining, smiling and deeply moved as she listens to someone singing to her. Warm hallway light and fairy lights behind her.',
      move: { from: 1.0, to: 1.08, focal: [0.5, 0.38] },
      text: [
        line('mum', 24.25, 28.8, ['Merry Christmas, Mum,', 'from all of us']),
        line('mum', 29.01, 31.6, ['The magic was', 'always you']),
        line('mum', 31.89, 35.7, ['Merry Christmas, Mum,', 'from Siobhan and Niamh']),
        line('mum', 36.01, 38.3, ['We’d be lost', 'without you']),
      ],
    },
    {
      name: 'street',
      len: 13.6,
      dissolve: 1.3,
      style: 'winterDoorstep',
      look: 'fog',
      ref: FOG_REF,
      prompt:
        'Wide view from across a foggy British terraced street at night. One front door stands open with warm light spilling down the garden path; a small group of carol singers with lanterns stand on the doorstep, seen from behind, and a figure stands in the doorway. Every other house is dark. Frost on the pavement.',
      move: { from: 1.25, to: 1.0, focal: [0.5, 0.6] },
      text: [{ type: 'cinematic', lines: ['Say it', 'in a song.'], y: 0.26, at: 5.2, fin: 1.6 }],
    },
  ],
  sound: [
    // The hallway: quiet, a clock, then a knock.
    { kind: 'room', env: [[0, 0.1], [DOOR, 0.1], [DOOR + 0.9, 0]] },
    { kind: 'tick', env: [[0, 0.18], [DOOR - 0.2, 0.18], [DOOR + 0.6, 0]] },
    { kind: 'knock', at: 1.2, level: 0.22 },
    // The song through the front door, heard in the hallway.
    { kind: 'file', file: SONG, highpass: 120, lowpass: 750, room: 'hallway', roomMix: [6, 10], env: [[0, 0.5], [DOOR - 0.2, 0.58], [DOOR + 0.7, 0]] },
    { kind: 'door', at: DOOR - 0.05, level: 0.5 },
    // The door is open: the song on the doorstep, and the cold coming in.
    { kind: 'file', file: SONG, env: [[DOOR - 0.2, 0], [DOOR + 0.7, 0.95], [STEP_BACK, 0.95], [STEP_BACK + 1.4, 0]] },
    // From across the street: softer and duller.
    { kind: 'file', file: SONG, lowpass: 2600, env: [[STEP_BACK, 0], [STEP_BACK + 1.4, 0.6], ['end', 0.5]] },
    { kind: 'wind', env: [[0, 0], [DOOR - 0.2, 0], [DOOR + 1, 0.2], [STEP_BACK, 0.2], [STEP_BACK + 2, 0.4]] },
  ],
};
