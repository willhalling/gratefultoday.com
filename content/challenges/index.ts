/**
 * PDF Challenge Registry
 * Central registry of all available challenges
 */

import type { ChallengeDefinition } from '@/types/pdf-challenge';
import { recoveryChallenge } from './7-day-recovery';

// Add new challenges here as they are created
export const challengeRegistry: Record<string, ChallengeDefinition> = {
  '7-day-gratitude-challenge-for-recovery': recoveryChallenge,
  // Future challenges:
  // '30-day-gratitude-challenge': thirtyDayChallenge,
  // '7-day-mindfulness-challenge': mindfulnessChallenge,
};

/**
 * Get a challenge by slug
 */
export function getChallengeBySlug(slug: string): ChallengeDefinition | undefined {
  return challengeRegistry[slug];
}

/**
 * Get all available challenge slugs
 */
export function getAllChallengeSlugs(): string[] {
  return Object.keys(challengeRegistry);
}

/**
 * Validate if a challenge exists
 */
export function challengeExists(slug: string): boolean {
  return slug in challengeRegistry;
}
