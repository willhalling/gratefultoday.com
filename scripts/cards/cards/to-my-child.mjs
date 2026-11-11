/**
 * A letter to open when you're grown — a parent writes down this Christmas for
 * their child, one a year. Bought again every December.
 *
 * The story: the tiny things about a four-year-old that will be gone by next
 * year, kept.
 *
 * Personalised by the buyer: the child's age, three small things they do or
 * say this year, who it's from, and (in the real card) their own photos.
 * No faces in the stand-in images, so any parent sees their own child.
 */
export default {
  id: 'to-my-child',
  title: 'A letter to open when you’re grown',
  style: 'warmNow',
  look: 'soft',
  fadeOut: 2.5,
  shots: [
    {
      name: 'door',
      len: 7.5,
      prompt:
        "Wide view from the landing through a wide-open bedroom door at night into a small child's bedroom. The room is softly but clearly lit by a warm nightlight and a string of fairy lights along the headboard, so everything can be seen: a small shape asleep under a patterned duvet with only tousled hair showing, a red Christmas stocking hanging on the end of the bed, a teddy on the floor. The bedroom fills most of the frame.",
      move: { from: 1.0, to: 1.08, focal: [0.5, 0.55] },
      text: [
        { type: 'cinematic', lines: ['A letter to open', 'when you’re grown.'], y: 0.24, at: 0, for: 6.4, scrim: true },
        { type: 'caption', lines: ['Christmas Eve, 2026'], y: 0.74, at: 2.6, for: 4.0, scrim: true },
      ],
    },
    {
      name: 'boots',
      len: 8.5,
      prompt:
        "A pair of tiny red children's wellington boots on a doormat by a front door, next to a pair of large adult walking boots. A small coat with mittens on a string hangs on a low hook above them. The hallway is lit by fairy lights.",
      move: { from: 1.0, to: 1.08, focal: [0.5, 0.6] },
      text: [{ type: 'letter', lines: ['You are four.', 'You call these your snow boots,', 'even in July.'], y: 0.24, at: 1.2, for: 6.2, scrim: true }],
    },
    {
      name: 'star',
      len: 8.5,
      prompt:
        'Close-up of the top of a real Christmas tree with a lopsided handmade cardboard star covered in glitter and blobs of glue, clearly made by a small child. Warm fairy lights, very shallow depth of field.',
      move: { from: 1.0, to: 1.08, focal: [0.5, 0.35] },
      text: [{ type: 'letter', lines: ['You made this star at nursery.', 'It goes on top', 'every year now.'], y: 0.72, at: 1.2, for: 6.2, scrim: true }],
    },
    {
      name: 'tree',
      len: 8.5,
      prompt:
        'A small child in pyjamas seen from behind, standing barefoot in a dark living room very early on Christmas morning, looking up at a lit Christmas tree much taller than them. Their face is not visible. A soft glow from the tree on the carpet.',
      move: { from: 1.0, to: 1.09, focal: [0.5, 0.6] },
      text: [{ type: 'letter', lines: ['Tonight you asked me', 'if Santa gets lonely.'], y: 0.22, at: 1.4, for: 5.8, scrim: true }],
    },
    {
      name: 'hand',
      // Long enough for the closing line to sit for three seconds before the fade.
      len: 12.5,
      dissolve: 1.5,
      prompt:
        "Close-up of a small child's hand holding an adult's finger. A pyjama sleeve and the cuff of a wool jumper. Blurred Christmas tree lights behind. No faces.",
      move: { from: 1.0, to: 1.08, focal: [0.5, 0.5] },
      text: [
        { type: 'letter', lines: ['I wanted to keep this one.', 'Love, Dad.'], y: 0.24, at: 1.2, for: 4.2, scrim: true },
        { type: 'cinematic', lines: ['Write this year down.'], y: 0.24, at: 6.2, scrim: true },
      ],
    },
  ],
  sound: [
    { kind: 'room', level: 0.1 },
    { kind: 'tick', env: [[0, 0.16], ['boots', 0.16], ['boots+2', 0]] },
    { kind: 'music', tune: 'silent-night', room: 'living-room', at: 1.2, env: [[1.2, 0.3], [5, 0.44], ['end', 0.5]] },
  ],
};
