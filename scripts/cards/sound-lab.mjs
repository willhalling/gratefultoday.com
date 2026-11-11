#!/usr/bin/env node
/**
 * sound-lab — every sound idea for the song cards, as audio only, all on the
 * same test song, so they can be compared and tuned before any pictures exist.
 *
 *   node scripts/cards/sound-lab.mjs            render them all
 *   node scripts/cards/sound-lab.mjs church     render some
 *
 * Output: public/dev-media/sound-lab/<id>.mp3 and index.json (what the
 * listening page at /dev/sound-lab reads). To tune one, change its numbers
 * below and re-run it: a few seconds, no cost.
 *
 * Made once with fal and cached in sound-lab/_assets (a few pennies): the DJ's
 * voice, the stand-in voice note, and the song split into voice and instruments.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MEDIA, renderSound } from './engine.mjs';
import { fal } from './images.mjs';

const OUT = join(MEDIA, 'sound-lab');
const ASSETS = join(OUT, '_assets');
const SONG = join(MEDIA, 'song-test', 'minimax-phonetic.mp3');
const SONG_URL = JSON.parse(readFileSync(join(MEDIA, 'song-test', 'minimax-phonetic.json'), 'utf8')).url;

/** The test song, in seconds: when each part is sung. */
const S = { verse: 12.45, line3: 17.77, chorus: 24.25, name: [31.89, 35.7], outro: 38.7, len: 52.5 };

const ffmpeg = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
const seconds = (file) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }));
const download = async (url, file) => writeFileSync(file, Buffer.from(await (await fetch(url)).arrayBuffer()));

/* ---------- Things made once ---------- */

async function speech(name, voice, text) {
  const file = join(ASSETS, `${name}.mp3`);
  if (!existsSync(file)) await download((await fal('fal-ai/elevenlabs/tts/turbo-v2.5', { text, voice, stability: 0.45 })).audio.url, file);
  return { file, len: seconds(file) };
}

/** The song split into the voice and everything else. */
async function stems() {
  const vocals = join(ASSETS, 'vocals.mp3');
  const band = join(ASSETS, 'band.wav');
  if (!existsSync(vocals) || !existsSync(band)) {
    const r = await fal('fal-ai/demucs', { audio_url: SONG_URL, model: 'htdemucs', stems: ['vocals', 'drums', 'bass', 'other'], output_format: 'mp3' });
    await download(r.vocals.url, vocals);
    const parts = [];
    for (const k of ['drums', 'bass', 'other']) {
      parts.push(join(ASSETS, `${k}.mp3`));
      await download(r[k].url, parts.at(-1));
    }
    ffmpeg([...parts.flatMap((p) => ['-i', p]), '-filter_complex', 'amix=inputs=3:normalize=0', band]);
  }
  return { vocals, band };
}

/* ---------- The variations ---------- */

const clean = (env, extra = {}) => ({ kind: 'file', file: SONG, env, ...extra });
/** Fade from one treatment to the clean song over `over` seconds from `t`. */
const out = (t, level, over = 1.5) => [[0, level], [t, level], [t + over, 0]];
const into = (t, over = 1.5, level = 0.95) => [[t, 0], [t + over, level]];
/** Pitch a copy of the voice up or down (a different person singing along). */
const pitched = (ratio) => `asetrate=${Math.round(48000 * ratio)},aresample=48000,atempo=${(1 / ratio).toFixed(6)}`;

async function variations() {
  mkdirSync(ASSETS, { recursive: true });
  const dj = await speech('dj', 'Daniel', 'It’s Christmas Eve, and this next one is for Margaret in Leeds, from her daughters, Siobhan and Niamh. Merry Christmas, Margaret.');
  const note = await speech('voice-note', 'Lily', 'Hi Mum, it’s us. We made you something. Merry Christmas.');
  const { vocals, band } = await stems();

  const radioStart = 2.5; // the song starts under the DJ, as on real radio
  const noteStart = 0.5;
  const afterNote = +(noteStart + note.len + 1.0).toFixed(2);

  return [
    {
      id: 'plain',
      group: 'Reference',
      title: 'The song as it is',
      about: 'No treatment. Compare everything else against this.',
      length: S.len,
      sound: [clean([[0, 0.95]])],
    },

    // ----- Places: you hear it from somewhere else first -----
    {
      id: 'outside-in',
      group: 'Places',
      title: 'Outside, in',
      about: 'From a foggy street the song is muffled behind a wall. The door opens at 0:17 and you’re in the room. At 0:41 you leave, and it’s behind the wall again.',
      length: S.len,
      marks: { in: 17.6, out: 41.2 },
      sound: [
        { kind: 'wind', env: [[0, 0.45], ['in-0.2', 0.45], ['in+0.8', 0.02], ['out-0.2', 0.02], ['out+1.2', 0.4]] },
        { kind: 'file', file: SONG, highpass: 140, lowpass: 650, room: 'living-room', roomMix: [6, 10], env: [[0, 0.22], [6, 0.3], ['in-0.2', 0.55], ['in+0.7', 0], ['out-0.2', 0], ['out+0.9', 0.5], ['end', 0.3]] },
        clean([['in-0.2', 0], ['in+0.8', 0.95], ['out-0.2', 0.95], ['out+0.9', 0]]),
        { kind: 'door', at: 'in', level: 0.5 },
        { kind: 'door', at: 'out+0.5', level: 0.4 },
        { kind: 'room', env: [['in', 0], ['in+1', 0.08], ['out', 0.08], ['out+1', 0]] },
      ],
    },
    {
      id: 'carol-singers',
      group: 'Places',
      title: 'Carol singers at the door',
      about: 'You’re in the hallway: a clock, a knock at 0:01, singing through the front door. You open it at 0:12. From 0:40 you hear it from across the street.',
      length: S.len,
      marks: { door: 12.2, back: 39.6 },
      sound: [
        { kind: 'room', env: [[0, 0.1], ['door', 0.1], ['door+0.9', 0]] },
        { kind: 'tick', env: [[0, 0.18], ['door-0.2', 0.18], ['door+0.6', 0]] },
        { kind: 'knock', at: 1.2, level: 0.22 },
        { kind: 'file', file: SONG, highpass: 120, lowpass: 750, room: 'hallway', roomMix: [6, 10], env: [[0, 0.5], ['door-0.2', 0.58], ['door+0.7', 0]] },
        { kind: 'door', at: 'door-0.05', level: 0.5 },
        clean([['door-0.2', 0], ['door+0.7', 0.95], ['back', 0.95], ['back+1.4', 0]]),
        { kind: 'file', file: SONG, lowpass: 2600, env: [['back', 0], ['back+1.4', 0.6], ['end', 0.5]] },
        { kind: 'wind', env: [[0, 0], ['door-0.2', 0], ['door+1', 0.2], ['back', 0.2], ['back+2', 0.4]] },
      ],
    },
    {
      id: 'coming-downstairs',
      group: 'Places',
      title: 'Coming downstairs',
      about: 'A child on the landing: the song comes up through the floor, dull and boomy. Five stair creaks. The living room door opens for the chorus at 0:23.',
      length: S.len,
      marks: { door: 23.4 },
      sound: [
        { kind: 'room', env: [[0, 0.1], ['door', 0.1], ['door+1', 0.04]] },
        { kind: 'tick', env: [[0, 0.12], ['door-1', 0.12], ['door', 0]] },
        { kind: 'file', file: SONG, highpass: 60, lowpass: 380, room: 'hallway', roomMix: [6, 10], env: [[0, 0.35], [10, 0.42], ['door-0.4', 0.6], ['door+0.8', 0]] },
        ...[3.5, 6.2, 9.0, 11.8, 14.6].map((t) => ({ kind: 'door', at: t, level: 0.16 })),
        { kind: 'door', at: 'door-0.1', level: 0.35 },
        clean([['door-0.4', 0], ['door+0.9', 0.95]]),
      ],
    },
    {
      id: 'drive-home',
      group: 'Places',
      title: 'The drive home',
      about: 'In the car on Christmas Eve: the song on the car radio, road rumble and wipers. At 0:38 the engine stops, the door shuts, and the last “Merry Christmas, Mum” is clear in the cold air.',
      length: S.len,
      marks: { stop: 38.0 },
      sound: [
        { kind: 'road', env: [[0, 0.45], ['stop-2.5', 0.45], ['stop', 0]] },
        { kind: 'file', file: SONG, highpass: 150, lowpass: 5200, room: 'car', roomMix: [8, 6], env: [[0, 0.75], ['stop', 0.75], ['stop+1.2', 0]] },
        { kind: 'door', at: 'stop+0.9', level: 0.5 },
        clean([['stop', 0], ['stop+1.4', 0.95]]),
        { kind: 'wind', env: [['stop+0.8', 0], ['stop+2.5', 0.2]] },
      ],
    },
    {
      id: 'church',
      group: 'Places',
      title: 'The church at the end of the road',
      about: 'From the churchyard, a long echo and wind. You go in at 0:12 and it’s all around you. For the line with their names (0:32–0:36) it comes close and dry, then the echo returns.',
      length: S.len,
      marks: { door: 12.2, near: 31.5, far: 35.6 },
      sound: [
        { kind: 'wind', env: [[0, 0.35], ['door', 0.35], ['door+1', 0]] },
        { kind: 'file', file: SONG, lowpass: 1800, room: 'chapel', roomMix: [2, 10], env: [[0, 0.3], ['door-0.2', 0.42], ['door+1', 0]] },
        { kind: 'door', at: 'door', level: 0.45 },
        { kind: 'file', file: SONG, room: 'chapel', roomMix: [4, 9], env: [['door-0.2', 0], ['door+1', 0.8], ['near', 0.8], ['near+0.6', 0.12], ['far', 0.12], ['far+0.7', 0.8]] },
        clean([['near', 0], ['near+0.6', 0.95], ['far', 0.95], ['far+0.7', 0]]),
      ],
    },

    // ----- Devices: it starts small, then opens up -----
    {
      id: 'kitchen-radio',
      group: 'Devices',
      title: 'The kitchen radio',
      about: 'A small radio on the worktop: thin, one speaker, a bit of kitchen echo, a clock. It blooms into full sound for the chorus at 0:23.',
      length: S.len,
      marks: { bloom: 22.8 },
      sound: [
        { kind: 'room', env: out(22.8, 0.1, 2) },
        { kind: 'tick', env: out(22.8, 0.14, 1) },
        { kind: 'file', file: SONG, highpass: 300, lowpass: 3800, mono: true, room: 'kitchen', roomMix: [6, 5], env: out(22.8, 0.52, 2) },
        clean(into(22.8, 2)),
      ],
    },
    {
      id: 'phone-speaker',
      group: 'Devices',
      title: 'The phone speaker',
      about: 'Someone holds their phone up to play you something: tiny and tinny through the intro. It opens to full sound as the singing starts at 0:12.',
      length: S.len,
      sound: [
        { kind: 'room', level: 0.07 },
        { kind: 'file', file: SONG, highpass: 600, lowpass: 3600, mono: true, room: 'living-room', roomMix: [8, 2], env: out(12.0, 0.45, 1) },
        clean(into(12.0, 1)),
      ],
    },
    {
      id: 'answerphone',
      songAt: 1.4,
      group: 'Devices',
      title: 'The answerphone',
      about: 'A beep, then the verse down a phone line: narrow, with hiss, like a message left for you. It opens out for the chorus at 0:25.',
      length: S.len + 1.4,
      marks: { open: 25.0 },
      sound: [
        { kind: 'beep', at: 0.5, freq: 1000, dur: 0.5, level: 0.14 },
        { kind: 'hiss', env: [[0, 0.05], ['open', 0.05], ['open+1.5', 0]] },
        { kind: 'file', file: SONG, at: 1.4, highpass: 350, lowpass: 3200, mono: true, env: [[1.2, 0], [1.6, 0.5], ['open', 0.5], ['open+1.5', 0]] },
        clean(into(25.0), { at: 1.4 }),
      ],
    },
    {
      id: 'home-video',
      group: 'Devices',
      title: 'The old home video',
      about: 'The song on a worn tape: a clunk, hiss, dull treble, the pitch wobbling slightly. It clears to full quality for the chorus at 0:24.',
      length: S.len,
      marks: { clear: 23.8 },
      sound: [
        { kind: 'door', at: 0.15, level: 0.3 },
        { kind: 'hiss', env: out(23.8, 0.07, 1.6) },
        { kind: 'file', file: SONG, highpass: 90, lowpass: 4800, mono: true, filters: 'vibrato=f=0.7:d=0.25,vibrato=f=6.5:d=0.06', env: out(23.8, 0.6, 1.6) },
        clean(into(23.8, 1.6)),
      ],
    },
    {
      id: 'record-player',
      songAt: 2.6,
      group: 'Devices',
      title: 'The record player',
      about: 'The needle drops at 0:01, crackle, then the song starts at 0:03, warm, with a very slight waver, crackling all the way through. It ends on two clicks of the run-out groove.',
      length: S.len + 3.6,
      fadeOut: 1,
      sound: [
        { kind: 'door', at: 0.7, level: 0.3 },
        { kind: 'crackle', env: [[0.7, 0], [0.9, 0.3], [4, 0.2], [53, 0.2], [54.5, 0.3]] },
        { kind: 'file', file: SONG, at: 2.6, highpass: 40, lowpass: 9500, filters: 'vibrato=f=0.55:d=0.08', level: 0.9 },
        { kind: 'snap', at: 54.4, level: 0.12 },
        { kind: 'snap', at: 55.3, level: 0.12 },
      ],
    },
    {
      id: 'radio-dedication',
      songAt: radioStart,
      group: 'Devices',
      title: 'The radio dedication',
      about: `Static as someone tunes in, then a DJ reads the dedication over the song’s intro (0:03–0:${String(Math.round(3.2 + dj.len)).padStart(2, '0')}). The song plays through the radio and blooms to full for the chorus at 0:26.`,
      length: S.len + radioStart,
      marks: { dj: 3.2, djEnd: +(3.2 + dj.len).toFixed(2), bloom: radioStart + 23.9 },
      sound: [
        { kind: 'room', level: 0.07 },
        { kind: 'static', env: [[0, 0.3], [2.2, 0.3], [3.0, 0.03], ['bloom', 0.025], ['bloom+1.5', 0]] },
        // Ducked under the DJ, then up.
        { kind: 'file', file: SONG, at: radioStart, highpass: 250, lowpass: 4200, mono: true, env: [[2.3, 0], [3.0, 0.24], ['djEnd', 0.24], ['djEnd+1', 0.55], ['bloom', 0.55], ['bloom+1.8', 0]] },
        { kind: 'file', file: dj.file, at: 'dj', highpass: 250, lowpass: 4200, mono: true, level: 0.85 },
        clean(into(radioStart + 23.9, 1.8), { at: radioStart }),
      ],
    },

    // ----- Moments: something happens inside the song -----
    {
      id: 'narrow-to-wide',
      group: 'Moments',
      title: 'Narrow to wide',
      about: 'The verse sits small in the middle, as if from one speaker. At the chorus (0:24) it spreads wide across both ears. Best on headphones.',
      length: S.len,
      sound: [{ kind: 'file', file: SONG, mono: true, env: out(23.9, 0.85, 0.8) }, { kind: 'file', file: SONG, filters: 'extrastereo=m=1.8', env: into(23.9, 0.8) }],
    },
    {
      id: 'name-alone',
      group: 'Moments',
      title: 'The names sung alone',
      about: 'For the line with their names (0:32–0:36) the instruments drop away and it’s just the voice. Then the band comes back.',
      length: S.len,
      sound: [
        { kind: 'file', file: vocals, sameGainAs: SONG, level: 0.95 },
        { kind: 'file', file: band, sameGainAs: SONG, env: [[31.3, 0.95], [31.85, 0], [35.5, 0], [36.0, 0.95]] },
      ],
    },
    {
      id: 'room-joins-in',
      group: 'Moments',
      title: 'The room joins in',
      about: 'From the last “Merry Christmas, Mum” (0:38) other voices sing along, as if the family has joined in, with two glasses clinking. The extra voices are the singer’s own, re-pitched, so this is a rough sketch.',
      length: S.len,
      sound: [
        clean([[0, 0.95]]),
        { kind: 'room', env: [[38, 0], [39, 0.1], [48, 0.1], [50, 0]] },
        ...[[0.84, 0.05], [1.06, 0.09], [0.94, 0.13]].map(([ratio, late]) => ({
          kind: 'file',
          file: vocals,
          at: late,
          filters: pitched(ratio),
          room: 'living-room',
          roomMix: [3, 8],
          env: [[38.2, 0], [39.0, 0.3], [47.5, 0.3], [49, 0]],
        })),
        { kind: 'bell', at: [38.5, 44.8], pitch: 2100, level: 0.1 },
      ],
    },
    {
      id: 'lyric-sounds',
      group: 'Moments',
      title: 'Sounds that follow the words',
      about: 'A smoke alarm chirps on “burn the sprouts” (0:13), an oven door on “the oven’s to blame” (0:16), a snore under “you fall asleep” (0:18–0:21), a cracker snaps into the chorus (0:24). All synthesised; real recordings would be better, the snore especially.',
      length: S.len,
      sound: [
        clean([[0, 0.95]]),
        { kind: 'beep', at: [13.25, 13.6], level: 0.07 },
        { kind: 'door', at: 16.5, level: 0.3 },
        { kind: 'snore', from: 18.3, to: 21.4, level: 0.5 },
        { kind: 'snap', at: 24.05, level: 0.4 },
      ],
    },
    {
      id: 'midnight-bells',
      group: 'Moments',
      title: 'Midnight bells',
      about: 'As the song ends, a church bell strikes three times in the distance (0:42, 0:46, 0:49), with a little wind.',
      length: S.len,
      sound: [clean([[0, 0.95]]), { kind: 'wind', env: [[38, 0], [42, 0.16]] }, { kind: 'bell', at: [42.5, 45.6, 48.7], pitch: 196, level: 0.26 }],
    },
    {
      id: 'voice-note',
      songAt: afterNote,
      group: 'Moments',
      title: 'Their own voice first',
      about: `A voice note plays first, as if on a phone (a generated stand-in voice here; the real one would be the buyer’s recording). The song starts at 0:${String(Math.round(afterNote)).padStart(2, '0')}.`,
      length: S.len + afterNote,
      sound: [
        { kind: 'room', level: 0.06 },
        { kind: 'snap', at: 0.2, level: 0.06 },
        { kind: 'file', file: note.file, at: noteStart, highpass: 350, lowpass: 3400, mono: true, level: 0.8 },
        clean([[afterNote, 0.95]], { at: afterNote }),
      ],
    },
  ];
}

const all = await variations();
const wanted = process.argv.slice(2);
for (const v of all) {
  if (wanted.length && !wanted.includes(v.id)) continue;
  renderSound(v);
  console.log(`${v.id.padEnd(20)} ${v.length.toFixed(1)} s`);
}
writeFileSync(join(OUT, 'index.json'), JSON.stringify(all.map(({ id, group, title, about, length, songAt = 0 }) => ({ id, group, title, about, length, songAt })), null, 2));
