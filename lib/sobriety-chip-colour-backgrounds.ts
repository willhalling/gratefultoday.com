/**
 * Bright photo backgrounds people can pick for a chip's story video.
 * Kept apart from sobriety-chip-backgrounds.ts so pages can load this list without the aesthetic pools.
 */

import colourBackgrounds from '@/content/sobriety-chip-colour-backgrounds.json';

export type ChipBackgroundCategory = 'sky' | 'flowers' | 'nature' | 'celebration' | 'glow';

export interface ChipBackgroundOption {
  id: string;
  label: string;
  category: ChipBackgroundCategory;
  url: string;
  thumbUrl: string;
  photographer: string;
}

/** The milestone's original moody image, kept as an option. */
export const CLASSIC_BACKGROUND_ID = 'classic';

export const CHIP_BACKGROUND_CATEGORIES: { id: ChipBackgroundCategory; label: string }[] = [
  { id: 'sky', label: 'Sky' },
  { id: 'flowers', label: 'Flowers' },
  { id: 'nature', label: 'Sea & nature' },
  { id: 'celebration', label: 'Celebration' },
  { id: 'glow', label: 'Glow' },
];

export const CHIP_BACKGROUND_OPTIONS = colourBackgrounds as ChipBackgroundOption[];

export function getChipBackgroundOption(id: string | undefined): ChipBackgroundOption | null {
  return CHIP_BACKGROUND_OPTIONS.find((option) => option.id === id) ?? null;
}

/** Early days open on sky, months on flowers, years on celebration. */
export function getDefaultChipBackgroundId(storyId: string, days: number): string {
  const category: ChipBackgroundCategory = days >= 365 ? 'celebration' : days >= 30 ? 'flowers' : 'sky';
  const options = CHIP_BACKGROUND_OPTIONS.filter((option) => option.category === category);
  const hash = Array.from(storyId).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return options[hash % options.length].id;
}
