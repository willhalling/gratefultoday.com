import type { SavedCard } from '@/lib/sobriety-cards';

export function getSharedCardSender(card: SavedCard | null): string {
  return card?.fromName?.trim() || 'Someone';
}
