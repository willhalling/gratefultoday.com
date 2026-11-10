export type SceneTemplateId =
  | 'intro'
  | 'gallery'
  | 'outro'
  | 'before'
  | 'after'
  | 'transition'
  | 'call-to-action'
  | 'review'
  | 'offer'
  | 'announcement'
  | 'tips'
  | 'audiogram'
  | 'episode'
  | 'guest'
  | 'quote';

export interface SceneSpec {
  templateId: SceneTemplateId;
  durationInFrames: number;
  assets: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface SceneTemplate {
  id: SceneTemplateId;
  defaultDurationInFrames: number;
}

export const SCENE_TEMPLATES: Record<SceneTemplateId, SceneTemplate> = {
  intro: { id: 'intro', defaultDurationInFrames: 90 },
  gallery: { id: 'gallery', defaultDurationInFrames: 150 },
  outro: { id: 'outro', defaultDurationInFrames: 90 },
  before: { id: 'before', defaultDurationInFrames: 90 },
  after: { id: 'after', defaultDurationInFrames: 90 },
  transition: { id: 'transition', defaultDurationInFrames: 30 },
  'call-to-action': { id: 'call-to-action', defaultDurationInFrames: 90 },
  review: { id: 'review', defaultDurationInFrames: 120 },
  offer: { id: 'offer', defaultDurationInFrames: 120 },
  announcement: { id: 'announcement', defaultDurationInFrames: 120 },
  tips: { id: 'tips', defaultDurationInFrames: 150 },
  audiogram: { id: 'audiogram', defaultDurationInFrames: 300 },
  episode: { id: 'episode', defaultDurationInFrames: 120 },
  guest: { id: 'guest', defaultDurationInFrames: 120 },
  quote: { id: 'quote', defaultDurationInFrames: 120 },
};

/**
 * Rough words-per-second reading speed for on-screen video text.
 * Slower than prose reading (150-200 wpm) because viewers also process visuals.
 */
const VIDEO_READING_WPS = 2.0;

/**
 * Estimate the duration (in frames) needed to read the given text on screen.
 * Adds a fixed buffer for entrance/exit and a minimum floor so very short
 * strings don't flash by.
 */
export function estimateReadingDurationFrames(text: string, fps = 30): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const seconds = Math.max(3, words / VIDEO_READING_WPS + 1.5);
  return Math.round(seconds * fps);
}

export function getSceneTemplate(id: SceneTemplateId): SceneTemplate {
  return SCENE_TEMPLATES[id];
}
