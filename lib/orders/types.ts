import { z } from 'zod';
import type { LookName } from '@/lib/looks';
import { RECOVERY_MILESTONES } from '@/lib/product';

const text = (max: number) => z.string().trim().max(max);
const required = (max: number, label: string) => text(max).min(1, `Please add ${label}.`);
const optional = (max: number) => text(max).optional().default('');

export const TONES = ['heartfelt', 'warm-and-light', 'funny'] as const;
export const RECOVERY_TONES = ['heartfelt', 'warm-and-light'] as const;

/**
 * How the script is written: "quote" is short and striking (4–7 lines);
 * "poetic" is a longer spoken-word piece (see POETIC_STYLE in ./prompts).
 */
export const SCRIPT_STYLES = ['quote', 'poetic'] as const;
export type ScriptStyle = (typeof SCRIPT_STYLES)[number];

export const THANKS_RELATIONSHIPS = [
  'teacher',
  'teaching assistant',
  'nurse',
  'doctor',
  'carer',
  'childminder',
  'colleague',
  'manager',
  'parent',
  'grandparent',
  'friend',
  'neighbour',
  'other',
] as const;

export const RECOVERY_RELATIONSHIPS = [
  'partner',
  'parent',
  'son or daughter',
  'brother or sister',
  'friend',
  'sponsor',
  'colleague',
  'other',
] as const;

const shared = {
  recipient_name: required(60, 'their name'),
  address_as: optional(60),
  sender_name: required(120, 'who it’s from'),
  specific_memory: optional(600),
  religious: z.boolean().default(false),
  anything_to_avoid: optional(300),
  name_pronunciation: optional(80),
  style: z.enum(SCRIPT_STYLES).default('quote'),
  email: z.string().trim().email('Please add a valid email address.').max(200),
};

export const ThanksAnswers = z.object({
  ...shared,
  relationship: z.enum(THANKS_RELATIONSHIPS),
  relationship_other: optional(60),
  what_they_did: required(1200, 'why you’re grateful'),
  tone: z.enum(TONES).default('heartfelt'),
});

export const RecoveryAnswers = z.object({
  ...shared,
  relationship: z.enum(RECOVERY_RELATIONSHIPS),
  relationship_other: optional(60),
  milestone: z.enum(RECOVERY_MILESTONES),
  milestone_other: optional(60),
  what_has_changed: required(1200, 'what you’ve noticed or admire'),
  /** What they're recovering from. Only said aloud if the buyer fills it in. */
  recovering_from: optional(80),
  tone: z.enum(RECOVERY_TONES).default('heartfelt'),
});

export type ThanksAnswers = z.infer<typeof ThanksAnswers>;
export type RecoveryAnswers = z.infer<typeof RecoveryAnswers>;

export const NewOrderRequest = z.discriminatedUnion('occasion', [
  z.object({ occasion: z.literal('thanks'), answers: ThanksAnswers }),
  z.object({ occasion: z.literal('recovery'), answers: RecoveryAnswers }),
]);
export type NewOrderRequest = z.infer<typeof NewOrderRequest>;

/** What the model returns. */
export const ScriptResult = z.object({
  status: z.enum(['ok', 'needs_review', 'declined']),
  reason: z.string(),
  title: z.string(),
  voice_direction: z.string(),
  visual_mood: z.enum(['calm', 'bright', 'cosy']),
  background_suggestion: z.string(),
  lines: z.array(z.string()),
});
export type ScriptResult = z.infer<typeof ScriptResult>;

export type Season = 'christmas' | 'new_year' | 'none';

export interface Script {
  title: string;
  /** The season the script was written for (older scripts don't have it). */
  season?: Season;
  voiceDirection: string;
  visualMood: ScriptResult['visual_mood'];
  backgroundSuggestion: string;
  lines: string[];
}

export type OrderStatus =
  | 'script_ready' // buyer is reviewing
  | 'needs_review' // held for a person to check
  | 'declined' // won't be made
  | 'approved' // buyer approved the script; production starts
  | 'narrating' // ElevenLabs is reading it
  | 'previewing' // WaveCanvas is rendering a short clip in each look
  | 'choosing' // buyer is picking a look
  | 'rendering' // WaveCanvas is making the video
  | 'ready' // video saved to our storage
  | 'failed'; // production failed (see productionError)

export const IN_PRODUCTION: readonly OrderStatus[] = ['approved', 'narrating', 'previewing', 'rendering'];

/** A short clip of the video in one look, for the buyer to choose from. */
export interface Preview {
  look: LookName;
  renderId: string;
  status: 'rendering' | 'ready' | 'failed';
  /** The clip in our storage, once ready. */
  clipPath: string | null;
}

export const ChooseRequest = z.object({ look: z.string().max(40) });

/** The buyer's edits to the script, checked before approval. */
export const ApproveRequest = z.object({
  title: text(80).min(1),
  lines: z
    .array(text(90).min(1))
    .min(3, 'A video needs at least three lines.')
    .max(40, 'That’s a little long. Try 40 lines or fewer.'),
});

export const RegenerateRequest = z.object({
  note: optional(400),
});

export const MAX_GENERATIONS = 4;
export const MAX_WORDS = 80;

export const wordCount = (lines: string[]) => lines.join(' ').split(/\s+/).filter(Boolean).length;
