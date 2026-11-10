import backgroundMap from '@/content/sobriety-chip-backgrounds.json';
import aestheticPools from '@/public/aesthetics/pools.json';

interface BackgroundSelection {
  aesthetic: string;
  index: number;
}

const selections = backgroundMap as Record<string, BackgroundSelection>;
const pools = aestheticPools as {
  pools: Record<string, { portrait?: { images?: string[] } }>;
};

export function getSobrietyChipBackgroundSelection(id: string): BackgroundSelection {
  const selection = selections[id];
  if (!selection) throw new Error(`Missing background direction for: ${id}`);
  return selection;
}

export function getSobrietyChipBackground(id: string): BackgroundSelection & { url: string } {
  const selection = getSobrietyChipBackgroundSelection(id);
  const url = pools.pools[selection.aesthetic]?.portrait?.images?.[selection.index];
  if (!url) throw new Error(`Missing background image for: ${id}`);
  return { ...selection, url };
}
