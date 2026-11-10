import type { WordTiming } from '@/lib/renderer/types';
import type { LyricPhrase } from '@/lib/renderer/vendor/slots/lyricPhrase';
import {
  STORY_DURATION_SECONDS,
  type SobrietyChipStory,
} from '@/lib/sobriety-chip-story';

export interface StoryTimingAsset {
  id: string;
  duration: number;
  words: WordTiming[];
  lyrics: LyricPhrase[];
}

export interface StoryAudioBundle {
  audioBuffer: AudioBuffer;
  lyrics: LyricPhrase[];
  words: WordTiming[];
  narrationDuration: number;
}

const AMBIENT_URL = '/audio/sobriety-stories/ambient.mp3';
const SAMPLE_RATE = 48000;
const bundleCache = new Map<string, Promise<StoryAudioBundle>>();

async function fetchBytes(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load story audio: ${url} (${response.status}).`);
  return response.arrayBuffer();
}

async function fetchTimings(story: SobrietyChipStory): Promise<StoryTimingAsset> {
  const response = await fetch(story.timingsUrl);
  if (!response.ok) {
    throw new Error(`Narration timings are missing for ${story.id}. Run the story audio generator.`);
  }
  return response.json() as Promise<StoryTimingAsset>;
}

function mixAudio(
  narration: AudioBuffer,
  ambient: AudioBuffer,
  narrationDuration: number,
  palette: SobrietyChipStory['palette'],
  ambientBoost = 1,
): AudioBuffer {
  const length = STORY_DURATION_SECONDS * SAMPLE_RATE;
  const context = new OfflineAudioContext(2, length, SAMPLE_RATE);
  const output = context.createBuffer(2, length, SAMPLE_RATE);
  const ambientBase = (palette === 'years' ? 0.2 : palette === 'months' ? 0.17 : 0.14) * ambientBoost;

  for (let channel = 0; channel < 2; channel += 1) {
    const narrationData = channel < narration.numberOfChannels ? narration.getChannelData(channel) : narration.getChannelData(0);
    const ambientData = channel < ambient.numberOfChannels ? ambient.getChannelData(channel) : ambient.getChannelData(0);
    const outputData = output.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      const time = index / SAMPLE_RATE;
      const narrationSample = index < narrationData.length ? narrationData[index] : 0;
      const ambientSample = index < ambientData.length ? ambientData[index] : 0;
      const duck = time < narrationDuration ? 0.42 : 1;
      const fadeIn = Math.min(1, time / 1.2);
      const fadeOut = time > 17 ? Math.max(0, (20 - time) / 3) : 1;
      const mixed = narrationSample * 0.94 + ambientSample * ambientBase * duck * fadeIn * fadeOut;
      outputData[index] = Math.max(-1, Math.min(1, mixed));
    }
  }
  return output;
}

async function prepareStoryAudio(story: SobrietyChipStory): Promise<StoryAudioBundle> {
  const [narrationBytes, ambientBytes, timings] = await Promise.all([
    fetchBytes(story.narrationUrl),
    fetchBytes(AMBIENT_URL),
    fetchTimings(story),
  ]);
  const context = new AudioContext({ sampleRate: SAMPLE_RATE });
  let audioBuffer: AudioBuffer;
  try {
    const [narration, ambient] = await Promise.all([
      context.decodeAudioData(narrationBytes),
      context.decodeAudioData(ambientBytes),
    ]);
    audioBuffer = mixAudio(narration, ambient, timings.duration, story.palette);
  } finally {
    await context.close();
  }
  return {
    audioBuffer,
    lyrics: timings.lyrics,
    words: timings.words,
    narrationDuration: timings.duration,
  };
}

export function loadStoryAudio(story: SobrietyChipStory): Promise<StoryAudioBundle> {
  const cached = bundleCache.get(story.id);
  if (cached) return cached;
  const promise = prepareStoryAudio(story).catch((error) => {
    bundleCache.delete(story.id);
    throw error;
  });
  bundleCache.set(story.id, promise);
  return promise;
}

const ambientCache = new Map<string, Promise<AudioBuffer>>();

/** Ambient music alone, for stories whose words were rewritten and no longer match the narration. */
export function loadStoryAmbientAudio(story: SobrietyChipStory): Promise<AudioBuffer> {
  const cached = ambientCache.get(story.palette);
  if (cached) return cached;
  const promise = (async () => {
    const context = new AudioContext({ sampleRate: SAMPLE_RATE });
    try {
      const ambient = await context.decodeAudioData(await fetchBytes(AMBIENT_URL));
      const silence = context.createBuffer(1, 1, SAMPLE_RATE);
      // Without a voice on top, the music carries the video, so lift it.
      return mixAudio(silence, ambient, 0, story.palette, 2.5);
    } finally {
      await context.close();
    }
  })().catch((error) => {
    ambientCache.delete(story.palette);
    throw error;
  });
  ambientCache.set(story.palette, promise);
  return promise;
}
