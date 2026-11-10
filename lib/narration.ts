import 'server-only';

/**
 * Narration: ElevenLabs reads the approved script aloud and returns the MP3
 * with character timings, which become word timings for WaveCanvas.
 *
 * The narrator reads the lines joined with spaces. If the buyer told us how
 * to say the recipient's name, the narrator is given that spelling instead,
 * word for word, while the on-screen words keep the real name.
 */

/** "George": warm, mature British narrator (ElevenLabs premade). Override with ELEVENLABS_VOICE_ID. */
const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';

export interface NarrationWord {
  word: string;
  start: number;
  end: number;
}

export interface Narration {
  audio: Buffer;
  words: NarrationWord[];
  /** Seconds, from the end of the last word plus a short tail. */
  duration: number;
}

const tokens = (s: string) => s.trim().split(/\s+/).filter(Boolean);
const bare = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}'-]/gu, '');

/**
 * What the narrator reads, token for token with the display text. Where a
 * run of display tokens matches `name` (ignoring case and punctuation), each
 * token is swapped for the matching token of `sayAs`, keeping punctuation.
 * Only when both have the same number of words, so timings still line up.
 */
export function spokenTokens(display: string[], names: string[], sayAs?: string): string[] {
  const say = sayAs ? tokens(sayAs) : [];
  if (!say.length) return display;
  const out = [...display];
  for (const name of names) {
    const n = tokens(name).map(bare);
    if (!n.length || n.length !== say.length) continue;
    for (let i = 0; i + n.length <= out.length; i++) {
      if (n.every((t, j) => bare(display[i + j]) === t)) {
        for (let j = 0; j < n.length; j++) {
          const original = display[i + j];
          const trail = original.match(/[^\p{L}\p{N}'-]+$/u)?.[0] ?? '';
          const lead = original.match(/^[^\p{L}\p{N}'-]+/u)?.[0] ?? '';
          out[i + j] = `${lead}${say[j]}${trail}`;
        }
      }
    }
  }
  return out;
}

interface Alignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

/** Word timings from ElevenLabs character timings (split on whitespace). */
export function wordsFromAlignment(text: string, alignment: Alignment): NarrationWord[] {
  const { characters, character_start_times_seconds: starts, character_end_times_seconds: ends } = alignment;
  if (!characters?.length || characters.length !== text.length || starts.length !== characters.length) {
    throw new Error('ElevenLabs did not return usable character alignment.');
  }
  const words: NarrationWord[] = [];
  let current = '';
  let start = 0;
  let end = 0;
  characters.forEach((char, i) => {
    if (/\s/.test(char)) {
      if (current) words.push({ word: current, start, end });
      current = '';
      return;
    }
    if (!current) start = starts[i];
    current += char;
    end = ends[i];
  });
  if (current) words.push({ word: current, start, end });
  return words;
}

export async function narrate(
  lines: string[],
  options: { names?: string[]; sayAs?: string; voiceId?: string } = {},
): Promise<Narration> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set.');

  const display = lines.flatMap(tokens);
  const spoken = spokenTokens(display, options.names ?? [], options.sayAs);
  const text = spoken.join(' ');

  const voiceId = options.voiceId || process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      language_code: 'en',
      voice_settings: { stability: 0.6, similarity_boost: 0.75, style: 0.15, speed: 0.95, use_speaker_boost: true },
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`ElevenLabs returned ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const data = (await res.json()) as { audio_base64: string; alignment?: Alignment; normalized_alignment?: Alignment };
  const alignment = data.alignment ?? data.normalized_alignment;
  if (!alignment) throw new Error('ElevenLabs returned no alignment.');
  const timed = wordsFromAlignment(text, alignment);
  if (timed.length !== display.length) {
    throw new Error(`Narration has ${timed.length} words but the script has ${display.length}.`);
  }

  // Show the real words on screen, timed by what was said.
  const words = timed.map((w, i) => ({ word: display[i], start: w.start, end: w.end }));
  const duration = Math.round((words[words.length - 1].end + 1.5) * 100) / 100;
  return { audio: Buffer.from(data.audio_base64, 'base64'), words, duration };
}
