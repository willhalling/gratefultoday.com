/**
 * A Christmas letter from the dog — funny first, then it gets you.
 * A gift for whoever the dog loves most.
 *
 * The story: a confession, no remorse, and then the true thing: the dog waits
 * at the window every day.
 *
 * Personalised by the buyer: who it's to, the dog's name, the crime, the
 * waiting spot, and (in the real card) their own photos of the dog.
 */
export default {
  id: 'from-the-dog',
  title: 'A Christmas letter from the dog',
  style: 'warmNow',
  look: 'soft',
  fadeOut: 2,
  // Described the same way in every prompt, so it's the same dog in every shot.
  subjects: { dog: 'a scruffy tan border terrier with wiry fur, a grey muzzle and a red collar' },
  shots: [
    {
      name: 'hello',
      len: 6.5,
      prompt:
        'Portrait of {dog} sitting on a rug in front of a Christmas tree in a cosy living room, looking straight into the camera with its head tilted, wearing a slightly crooked paper cracker crown.',
      move: { from: 1.0, to: 1.07, focal: [0.5, 0.55] },
      text: [{ type: 'cinematic', lines: ['A Christmas letter', 'from the dog.'], y: 0.72, at: 0, for: 5.6, scrim: true }],
    },
    {
      name: 'crime',
      len: 8,
      prompt:
        '{dog} lying on a kitchen floor looking guilty with its ears back, beside an empty overturned roasting tray, torn kitchen foil and a few scattered cocktail sticks. Low angle at floor level, warm kitchen light.',
      move: { from: 1.0, to: 1.08, focal: [0.5, 0.55] },
      text: [{ type: 'letter', lines: ['Dear Dad,', 'I ate the pigs in blankets.', 'All of them.'], y: 0.22, at: 1.0, for: 6.0, scrim: true }],
    },
    {
      name: 'sofa',
      len: 7,
      prompt: '{dog} fast asleep on its back on a sofa on a tartan blanket, paws in the air, completely content. Christmas tree lights blurred in the background.',
      move: { from: 1.03, to: 1.1, focal: [0.5, 0.55] },
      text: [{ type: 'letter', lines: ['I am not sorry.'], y: 0.22, at: 1.4, for: 4.2, scrim: true }],
    },
    {
      name: 'window',
      len: 8.5,
      prompt:
        '{dog} seen from behind, sitting on the back of a sofa looking out of a front room window at a foggy British street at dusk, waiting for someone. Fairy lights around the window frame, the room dim behind.',
      move: { from: 1.0, to: 1.1, focal: [0.5, 0.45] },
      text: [{ type: 'letter', lines: ['But I wait at this window', 'every day', 'until you come home.'], y: 0.72, at: 1.2, for: 6.2, scrim: true }],
    },
    {
      name: 'love',
      // Long enough for the closing line to sit for three seconds before the fade.
      len: 11.5,
      dissolve: 1.5,
      prompt: "Close-up of {dog} resting its chin on a person's knee, big brown eyes looking up at them, warm firelight, very shallow depth of field. Only the person's knee is visible.",
      move: { from: 1.0, to: 1.08, focal: [0.5, 0.45] },
      text: [
        { type: 'letter', lines: ['Merry Christmas.', 'Love, Biscuit.'], y: 0.74, at: 1.2, for: 3.8, scrim: true },
        { type: 'cinematic', lines: ['From the ones', 'who can’t write.'], y: 0.74, at: 5.4, scrim: true },
      ],
    },
  ],
  sound: [
    { kind: 'fire', env: [[0, 0.3], ['end', 0.3]] },
    { kind: 'room', level: 0.08 },
    // Playful to begin with; it slows nothing down, the words do the turn.
    { kind: 'music', tune: 'we-wish', bpm: 104, room: 'living-room', at: 0.4, env: [[0, 0.4], ['window', 0.4], ['window+2', 0.3], ['end', 0.34]] },
  ],
};
