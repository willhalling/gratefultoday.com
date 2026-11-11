/**
 * The magic was you, Mum — a thank-you to the person who made Christmas happen.
 * For a living parent: she watches it on Christmas morning.
 *
 * The story: outside at 1am one window is still lit → what she was doing in
 * there → the proof she left for us → what we thought it was → her, now.
 *
 * Personalised by the buyer: the three "you did this" details, the year, the
 * name, and the last photo (here a generated stand-in; the real card uses hers).
 */
import { FOG_REF } from '../engine.mjs';

export default {
  id: 'magic-mum',
  title: 'The magic was you, Mum',
  style: 'warm90s',
  look: 'memory',
  fadeOut: 2.5,
  shots: [
    {
      name: 'street',
      len: 7.5,
      style: 'fogNight',
      look: 'fog',
      ref: FOG_REF,
      prompt:
        'A British semi-detached house at one in the morning on Christmas Eve, seen from the pavement through thick fog. Every window is dark except one downstairs kitchen window glowing warm yellow. Frost on a parked car, a wreath on the front door.',
      move: { from: 1.0, to: 1.08, focal: [0.5, 0.65] },
      text: [{ type: 'cinematic', lines: ['The magic of Christmas', 'was never Santa.'], y: 0.26, at: 0, for: 6.6 }],
    },
    {
      name: 'table',
      len: 9.5,
      prompt:
        'Over-the-shoulder view from behind of a woman in a dressing gown sitting at a kitchen table late at night wrapping Christmas presents. Only her hands, her shoulder and the back of her head are visible; her face is not visible. Rolls of wrapping paper, scissors, sellotape, a mug of tea gone cold, a single lamp over the table, the rest of the kitchen dark.',
      move: { from: 1.0, to: 1.08, focal: [0.5, 0.6] },
      text: [
        { type: 'caption', lines: ['Christmas Eve, 1996 · 1 am'], y: 0.16, at: 0.9, for: 3.4, scrim: true },
        { type: 'letter', lines: ['You wrapped everything', 'after we were asleep.'], y: 0.7, at: 3.6, for: 5.2, scrim: true },
      ],
    },
    {
      name: 'carrot',
      len: 8.5,
      prompt:
        // (Don't mention a fireplace: the model lights it every time.)
        'Close-up of a small china plate left on the carpet beside the base of a Christmas tree at night. On the plate: a bright orange raw carrot with its green leafy top still attached and a large bite missing from the pointed end, next to a half-eaten mince pie and crumbs, and a small empty glass. Lit only by the multicoloured fairy lights on the tree, the room dark around it. Nobody there, no hands.',
      move: { from: 1.02, to: 1.1, focal: [0.5, 0.62] },
      text: [{ type: 'letter', lines: ['You even took a bite', 'out of the carrot.'], y: 0.22, at: 1.8, for: 5.4, scrim: true }],
    },
    {
      name: 'morning',
      len: 9,
      prompt:
        "A child's-eye view from a doorway into a living room very early on Christmas morning: a real Christmas tree with coloured lights, presents underneath in mismatched wrapping paper, a stocking hung by the fire, weak blue dawn light through closed curtains. Nobody in the room.",
      move: { from: 1.0, to: 1.09, focal: [0.5, 0.5] },
      text: [
        { type: 'letter', lines: ['I thought it was magic.'], y: 0.7, at: 1.5, for: 3.4, scrim: true },
        { type: 'letter', lines: ['It was you.'], y: 0.7, at: 5.3, for: 3.4, scrim: true },
      ],
    },
    {
      name: 'mum',
      // Long enough for the closing line to sit for three seconds before the fade.
      len: 13.5,
      dissolve: 1.6,
      style: 'warmNow',
      look: 'soft',
      prompt:
        'An ordinary family snapshot of a British grandmother aged about seventy-two at the Christmas dinner table, mid-laugh, wearing a flimsy tissue-paper cracker crown slightly askew. Short natural white hair, glasses, deep laugh lines and wrinkles, a plain round-neck Christmas jumper. Unglamorous, no make-up, an everyday real person, looking just off camera at someone she loves. Half-finished plates and pulled crackers on the table, warm lamplight, blurred fairy lights behind her.',
      move: { from: 1.0, to: 1.07, focal: [0.5, 0.38] },
      text: [
        { type: 'caption', lines: ['This Christmas'], y: 0.655, at: 1.0, for: 5.4, scrim: true },
        { type: 'letter', lines: ['Thank you, Mum.'], y: 0.72, at: 2.4, for: 4.0, scrim: true },
        { type: 'cinematic', lines: ['Tell her', 'this Christmas.'], y: 0.72, at: 7.4, scrim: true },
      ],
    },
  ],
  sound: [
    // Outside in the cold, then the door closes on it.
    { kind: 'wind', env: [[0, 0.5], ['table-0.3', 0.5], ['table+1.0', 0.03]] },
    // Inside: a quiet house at 1am.
    { kind: 'room', env: [['table-0.2', 0], ['table+1.5', 0.12], ['end', 0.12]] },
    { kind: 'tick', env: [['table+0.3', 0], ['table+2', 0.22], ['morning-0.5', 0.22], ['morning+1.2', 0]] },
    // The music box starts on the carrot, the first smile.
    { kind: 'music', tune: 'silent-night', room: 'living-room', at: 'carrot+0.8', env: [['carrot+0.8', 0], ['carrot+3.5', 0.42], ['end', 0.5]] },
  ],
};
