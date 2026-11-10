import storyCatalog from '@/content/sobriety-chip-stories.json';
import chipCatalog from '@/json/sobriety-chips.json';
import type { LyricModeId } from '@/constants/lyric-modes';
import type { ClipAudioFrameData } from '@/lib/renderer/audio-engine';
import type { LyricPhrase } from '@/lib/renderer/vendor/slots/lyricPhrase';

export const STORY_DURATION_SECONDS = 20;
export const STORY_FPS = 30;
export const STORY_FRAME_COUNT = STORY_DURATION_SECONDS * STORY_FPS;
export const STORY_SCENES = {
  hook: { start: 0, end: 2 },
  honest: { start: 2, end: 7 },
  turn: { start: 7, end: 12 },
  reveal: { start: 12, end: 17 },
  close: { start: 17, end: 20 },
} as const;

export type StoryPalette = 'days' | 'months' | 'years';
export type StoryLyricMode = Extract<LyricModeId, 'clean-fade' | 'calm-waves' | 'wave' | 'headline'>;

export interface SobrietyChipStory {
  id: string;
  days: number;
  hook: string;
  honest: string[];
  turn: string;
  reveal: string;
  close: string;
  palette: StoryPalette;
  lyricMode: StoryLyricMode;
  narrationUrl: string;
  timingsUrl: string;
}

export interface StoryWaveProfile {
  calmness: number;
  amplitude: number;
  frequency: number;
  speed: number;
  roughness: number;
  light: number;
}

const SUPPORTED_MODES = new Set<StoryLyricMode>(['clean-fade', 'calm-waves', 'wave', 'headline']);
const stories = storyCatalog as unknown as Record<string, Omit<SobrietyChipStory, 'id' | 'narrationUrl' | 'timingsUrl'>>;

export function validateSobrietyChipStories(): void {
  const expectedIds = new Set(chipCatalog.map((chip) => chip.id));
  const storyIds = Object.keys(stories);
  if (storyIds.length !== chipCatalog.length) {
    throw new Error(`Expected ${chipCatalog.length} sobriety stories, found ${storyIds.length}.`);
  }
  for (const chip of chipCatalog) {
    const story = stories[chip.id];
    if (!story) throw new Error(`Missing sobriety story: ${chip.id}`);
    if (!(story.days > 0)) throw new Error(`Invalid day count for story: ${chip.id}`);
    if (!story.hook || !story.turn || !story.reveal || !story.close || !story.honest.length) {
      throw new Error(`Incomplete story scenes for: ${chip.id}`);
    }
    if (story.honest.some((line) => !line.trim())) {
      throw new Error(`Empty honest scene for: ${chip.id}`);
    }
    if (!SUPPORTED_MODES.has(story.lyricMode)) {
      throw new Error(`Unsupported lyric mode for: ${chip.id}`);
    }
    if (!['days', 'months', 'years'].includes(story.palette)) {
      throw new Error(`Unsupported palette for: ${chip.id}`);
    }
  }
  for (const id of storyIds) {
    if (!expectedIds.has(id)) throw new Error(`Story references unknown milestone: ${id}`);
  }
}

validateSobrietyChipStories();

export function getSobrietyChipStory(chip: {
  id?: string;
  chipId?: string;
  chipNumber: number;
  chipText: string;
}): SobrietyChipStory {
  const id = chip.id ?? chip.chipId;
  const direct = id ? stories[id] : undefined;
  const fallbackId = Object.keys(stories).find((key) => {
    const chipData = chipCatalog.find((entry) => entry.id === key);
    return chipData?.chipNumber === chip.chipNumber &&
      chipData.chipText.toLowerCase() === chip.chipText.toLowerCase();
  });
  const resolvedId = direct ? id : fallbackId;
  if (!resolvedId || !stories[resolvedId]) {
    throw new Error(`No sobriety story found for ${id ?? `${chip.chipNumber} ${chip.chipText}`}.`);
  }
  return {
    id: resolvedId,
    ...stories[resolvedId],
    narrationUrl: `/audio/sobriety-stories/${resolvedId}.mp3`,
    timingsUrl: `/audio/sobriety-stories/${resolvedId}.json`,
  };
}

export function getStoryWaveProfile(days: number): StoryWaveProfile {
  const calmness = Math.max(0, Math.min(1, Math.log10(days + 1) / Math.log10(3651)));
  const mix = (start: number, end: number) => start + (end - start) * calmness;
  return {
    calmness,
    amplitude: mix(1, 0.08),
    frequency: mix(1.35, 0.18),
    speed: mix(1.25, 0.12),
    roughness: mix(0.95, 0.06),
    light: mix(0.18, 0.9),
  };
}

export function getStoryPalette(story: SobrietyChipStory): {
  background: string;
  backgroundEnd: string;
  accent: string;
  text: string;
} {
  if (story.palette === 'years') {
    return { background: '#100C0D', backgroundEnd: '#241B0E', accent: '#E3C98F', text: '#F5F5F4' };
  }
  if (story.palette === 'months') {
    return { background: '#071311', backgroundEnd: '#0B2925', accent: '#80C8BC', text: '#F0FDFA' };
  }
  return { background: '#080F1B', backgroundEnd: '#14283D', accent: '#8FB8D8', text: '#F0F6FC' };
}

function smoothstep(start: number, end: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

export function createStoryFrameData(
  story: SobrietyChipStory,
  fps = STORY_FPS,
): ClipAudioFrameData {
  const totalFrames = STORY_FRAME_COUNT;
  const padFrames = 7;
  const profile = getStoryWaveProfile(story.days);
  const frequencyData: Float32Array[] = new Array(totalFrames);
  const rawFrequencyData: Float32Array[] = new Array(totalFrames + padFrames);
  const backgroundWaveEnergy = new Array<number>(totalFrames);
  const rawBackgroundWaveEnergy = new Array<number>(totalFrames);

  const energyAt = (frame: number): number => {
    const time = frame / fps;
    const settle = smoothstep(10, 16, time);
    const loopReset = smoothstep(19, 20, time);
    const restless = profile.roughness * (0.78 + Math.sin(time * profile.speed * 5.2) * 0.12);
    const settled = Math.max(0.025, restless * (1 - settle * 0.82));
    const ripple = Math.sin(time * profile.frequency * 8 + frame * 0.013) * 0.07 * (1 - settle);
    return Math.max(0, Math.min(1, (settled + ripple) * (1 - loopReset) + restless * loopReset));
  };

  for (let frame = 0; frame < totalFrames + padFrames; frame += 1) {
    const sourceFrame = Math.min(frame, totalFrames - 1);
    const energy = energyAt(sourceFrame);
    const bins = new Float32Array(128);
    for (let bin = 0; bin < bins.length; bin += 1) {
      const falloff = Math.exp(-bin / 34);
      const movement = 0.72 + Math.sin(sourceFrame * 0.037 + bin * 0.41) * 0.18;
      bins[bin] = Math.max(0, energy * falloff * movement);
    }
    rawFrequencyData[frame] = bins;
    if (frame < totalFrames) {
      frequencyData[frame] = bins;
      backgroundWaveEnergy[frame] = energy;
      rawBackgroundWaveEnergy[frame] = energy;
    }
  }

  return {
    frequencyData,
    rawFrequencyData,
    backgroundWaveEnergy,
    rawBackgroundWaveEnergy,
    maxInt: 1,
    fps,
    totalFrames,
  };
}

function phrasesForText(text: string, start: number, end: number): LyricPhrase[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const groups: string[] = [];
  for (let index = 0; index < words.length; index += 5) {
    groups.push(words.slice(index, index + 5).join(' '));
  }
  return groups.map((group, index) => ({
    text: group,
    start: start + ((end - start) * index) / groups.length,
    end: start + ((end - start) * (index + 1)) / groups.length,
  }));
}

export function getStaticStoryLyrics(story: SobrietyChipStory): LyricPhrase[] {
  return [
    ...phrasesForText(story.hook, STORY_SCENES.hook.start, STORY_SCENES.hook.end),
    ...story.honest.flatMap((line) => phrasesForText(line, STORY_SCENES.honest.start, STORY_SCENES.honest.end)),
    ...phrasesForText(story.turn, STORY_SCENES.turn.start, STORY_SCENES.turn.end),
    ...phrasesForText(story.reveal, STORY_SCENES.reveal.start, STORY_SCENES.reveal.end),
    ...phrasesForText(story.close, STORY_SCENES.close.start, STORY_SCENES.close.end),
  ];
}

export function getStaticStoryWords(story: SobrietyChipStory): {
  word: string;
  start: number;
  end: number;
}[] {
  return getStaticStoryLyrics(story).flatMap((phrase) => {
    const words = phrase.text.split(/\s+/).filter(Boolean);
    const duration = (phrase.end - phrase.start) / Math.max(1, words.length);
    return words.map((word, index) => ({
      word,
      start: phrase.start + index * duration,
      end: phrase.start + (index + 1) * duration,
    }));
  });
}

export function getStoryNarrationText(story: SobrietyChipStory): string {
  return [story.hook, ...story.honest, story.turn, story.reveal, story.close].join(' ');
}

/** Captions for words someone wrote themselves, spread evenly before the close. */
export function getCustomStoryLyrics(text: string): LyricPhrase[] {
  return phrasesForText(text, 0.3, STORY_SCENES.close.start);
}

export function getCustomStoryWords(text: string): { word: string; start: number; end: number }[] {
  return getCustomStoryLyrics(text).flatMap((phrase) => {
    const words = phrase.text.split(/\s+/).filter(Boolean);
    const duration = (phrase.end - phrase.start) / Math.max(1, words.length);
    return words.map((word, index) => ({
      word,
      start: phrase.start + index * duration,
      end: phrase.start + (index + 1) * duration,
    }));
  });
}
