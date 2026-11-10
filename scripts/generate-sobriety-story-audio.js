const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
require('dotenv').config();

const root = path.resolve(__dirname, '..');
const stories = require(path.join(root, 'content/sobriety-chip-stories.json'));
const outputDir = path.join(root, 'public/audio/sobriety-stories');
const manifestPath = path.join(outputDir, 'manifest.json');
const voiceId = process.env.ELEVENLABS_VOICE_ID || '3Q0HiHNecynsdqicntLT';
const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';

function narrationText(story) {
  return [story.hook, ...story.honest, story.turn, story.reveal, story.close].join(' ');
}

function wordsFromAlignment(text, alignment) {
  const characters = alignment?.characters;
  const starts = alignment?.character_start_times_seconds;
  const ends = alignment?.character_end_times_seconds;
  if (!characters || !starts || !ends || characters.length !== text.length) {
    throw new Error('ElevenLabs did not return usable character alignment.');
  }
  const words = [];
  let current = '';
  let start = 0;
  let end = 0;
  for (let index = 0; index < characters.length; index += 1) {
    const char = characters[index];
    if (/\s/.test(char)) {
      if (current) words.push({ word: current, start, end });
      current = '';
      continue;
    }
    if (!current) start = starts[index];
    current += char;
    end = ends[index];
  }
  if (current) words.push({ word: current, start, end });
  return words;
}

function lyricsFromWords(words) {
  const lyrics = [];
  for (let index = 0; index < words.length; index += 4) {
    const group = words.slice(index, index + 4);
    lyrics.push({
      text: group.map((entry) => entry.word).join(' '),
      start: group[0].start,
      end: group[group.length - 1].end,
    });
  }
  return lyrics;
}

async function generateNarration(id, story, force) {
  const audioPath = path.join(outputDir, `${id}.mp3`);
  const timingsPath = path.join(outputDir, `${id}.json`);
  if (!force && fs.existsSync(audioPath) && fs.existsSync(timingsPath)) {
    console.log(`Skipping ${id}; assets already exist.`);
    return;
  }
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is not configured.');
  }
  const text = narrationText(story);
  console.log(`Generating ${id} (${text.split(/\s+/).length} words)…`);
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: 0.65,
        similarity_boost: 0.75,
        style: 0.1,
        speed: 1.2,
        use_speaker_boost: true,
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`${id}: ElevenLabs returned ${response.status}: ${await response.text()}`);
  }
  const data = await response.json();
  const audio = Buffer.from(data.audio_base64, 'base64');
  const alignment = data.alignment || data.normalized_alignment;
  const words = wordsFromAlignment(text, alignment);
  const duration = words.length ? words[words.length - 1].end : 0;
  if (duration > 19.95) {
    throw new Error(`${id}: narration is ${duration.toFixed(2)}s, beyond the 19.95s limit.`);
  }
  fs.writeFileSync(audioPath, audio);
  fs.writeFileSync(
    timingsPath,
    `${JSON.stringify({ id, duration, words, lyrics: lyricsFromWords(words) }, null, 2)}\n`,
  );
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    : {};
  manifest[id] = {
    narration: `/audio/sobriety-stories/${id}.mp3`,
    timings: `/audio/sobriety-stories/${id}.json`,
    duration,
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Saved ${id} (${duration.toFixed(2)}s).`);
}

function writeAmbientWav(filePath) {
  const sampleRate = 48000;
  const duration = 20;
  const frames = sampleRate * duration;
  const channels = 2;
  const dataSize = frames * channels * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * 2, 28);
  buffer.writeUInt16LE(channels * 2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  const chords = [
    [146.83, 220.0, 293.66],
    [130.81, 196.0, 261.63],
    [110.0, 164.81, 220.0],
    [123.47, 185.0, 246.94],
  ];
  for (let frame = 0; frame < frames; frame += 1) {
    const time = frame / sampleRate;
    const chord = chords[Math.min(chords.length - 1, Math.floor(time / 5))];
    const chordFade = 0.55 + 0.45 * Math.sin((time % 5) / 5 * Math.PI);
    const breath = 0.72 + 0.28 * Math.sin(time * Math.PI * 0.22);
    const finalFade = time > 17 ? Math.max(0, (20 - time) / 3) : 1;
    for (let channel = 0; channel < channels; channel += 1) {
      let sample = 0;
      for (let note = 0; note < chord.length; note += 1) {
        const phase = channel === 0 ? 0 : note * 0.08;
        sample += Math.sin(2 * Math.PI * chord[note] * time + phase) / (note + 2);
        sample += 0.28 * Math.sin(2 * Math.PI * chord[note] * 2 * time + phase) / (note + 3);
      }
      sample *= 0.055 * chordFade * breath * finalFade;
      const value = Math.max(-1, Math.min(1, sample));
      buffer.writeInt16LE(Math.round(value * 32767), 44 + (frame * channels + channel) * 2);
    }
  }
  fs.writeFileSync(filePath, buffer);
}

function generateAmbient() {
  const target = path.join(outputDir, 'ambient.mp3');
  const wav = path.join(root, '.turbo', 'sobriety-story-ambient.wav');
  fs.mkdirSync(path.dirname(wav), { recursive: true });
  writeAmbientWav(wav);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', wav, '-codec:a', 'libmp3lame', '-q:a', '4', target]);
  fs.unlinkSync(wav);
  console.log('Saved original 20-second ambient bed.');
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const args = process.argv.slice(2);
  const onlyArg = args.find((arg) => arg.startsWith('--only='));
  const all = args.includes('--all');
  const force = args.includes('--force');
  if (!onlyArg && !all) {
    throw new Error('Use --only=24-hours,30-days or --all. Add --force to regenerate existing assets.');
  }
  const ids = onlyArg
    ? onlyArg.slice('--only='.length).split(',').map((id) => id.trim()).filter(Boolean)
    : Object.keys(stories);
  for (const id of ids) {
    if (!stories[id]) throw new Error(`Unknown milestone: ${id}`);
  }
  for (const id of ids) await generateNarration(id, stories[id], force);
  generateAmbient();
  console.log(`Completed ${ids.length} narration asset(s) plus ambient audio.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
