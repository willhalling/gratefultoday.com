export const CONTENT_OS_CATEGORIES = [
  'calls',
  'family',
  'meetings',
  'resentment',
  'identity',
  'mortality',
  'lost_years',
  'gratitude',
  'ordinary_life',
  'small_observations',
] as const;

export const CONTENT_OS_TOPICS = [
  'honesty',
  'hope',
  'surrender',
  'courage',
  'integrity',
  'willingness',
  'humility',
  'compassion',
  'amends',
  'perseverance',
  'spirituality',
  'service',
  'mortality',
  'regret',
  'acceptance',
  'forgiveness',
  'gratitude',
  'belonging',
  'time',
  'change',
  'aging',
  'sobriety',
  'perspective',
] as const;

export const CONTENT_OS_STATUS = [
  'idea',
  'generated',
  'approved',
  'rendering',
  'rendered',
  'render_failed',
  'scheduled',
  'posted',
  'archived',
] as const;

export type ContentOsCategory = (typeof CONTENT_OS_CATEGORIES)[number];
export type ContentOsTopic = (typeof CONTENT_OS_TOPICS)[number];
export type ContentOsStatus = (typeof CONTENT_OS_STATUS)[number];

export interface ContentOsPost {
  id: string;
  name: string;
  category: ContentOsCategory;
  mainTopic: ContentOsTopic;
  secondaryTopic: ContentOsTopic;
  beat1: string;
  beat2: string;
  beat3?: string;
  beat4?: string;
  description?: string;
  tags?: string[];
  status: ContentOsStatus;
  score: number;
  notes?: string;
  renderUrl?: string;
  renderedAt?: string;
  background?: string;
  music?: string;
  headlineWord?: string;
  createdAt: string;
  updatedAt: string;
}

export type ContentOsPostInput = Omit<ContentOsPost, 'id' | 'createdAt' | 'updatedAt'>;
