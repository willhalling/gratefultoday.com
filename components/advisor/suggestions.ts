import type { Mode } from '@/lib/advisor/types';

/**
 * Example prompts shown on the welcome screen, in the Ideas sheet and above the composer.
 * Tapping one puts its text in the composer (and switches voice or mode if set),
 * so it can be finished or edited before sending. Edit freely.
 */
export interface Suggestion {
  /** Short label for the chip. */
  label: string;
  /** Text put in the composer. Ending with "…" invites finishing the sentence. */
  text: string;
  /** Voice id from lib/advisor/voices.ts to switch to, if any. */
  voice?: string;
  /** Mode to switch to: a journal reflection (default) or a video script. */
  mode?: Mode;
}

export interface SuggestionGroup {
  title: string;
  hint: string;
  items: Suggestion[];
}

export const SUGGESTION_GROUPS: SuggestionGroup[] = [
  {
    title: 'Gratitude',
    hint: 'Name it, and it finds words that deepen it.',
    items: [
      { label: 'Three good things today', text: 'Three things I’m grateful for today: ' },
      { label: 'Someone I should thank', text: 'Someone I’ve never properly thanked is ' },
      { label: 'What am I taking for granted?', text: 'Help me notice what I’m taking for granted in my life right now.' },
    ],
  },
  {
    title: 'Hard moments',
    hint: 'Write it as it is. It answers like a friend who has read everything.',
    items: [
      { label: 'A craving right now', text: 'I’m having a craving right now and ' },
      { label: 'Angry with someone', text: 'I’m angry with someone and can’t let it go: ' },
      { label: 'Flat, and not sure why', text: 'I feel flat today and I can’t really say why.' },
      { label: 'Can’t switch off', text: 'My mind won’t switch off tonight. It keeps going back to ' },
    ],
  },
  {
    title: 'Daily practice',
    hint: 'Short rituals the old writers actually used.',
    items: [
      { label: 'Morning reading', text: 'Give me a short reading to set my mind for today.' },
      { label: 'Evening review', text: 'Walk me through an evening review of today, the way Seneca did it each night. Today I…', voice: 'seneca' },
      { label: 'One practice this week', text: 'Give me one small Stoic practice to try this week.', voice: 'stoic' },
    ],
  },
  {
    title: 'Ask a writer',
    hint: 'Picks that writer’s voice and quotes only them.',
    items: [
      { label: 'Seneca on wasted time', text: 'How do I stop wasting my time on things that don’t matter?', voice: 'seneca' },
      { label: 'Epictetus on control', text: 'What is actually in my control here? ', voice: 'epictetus' },
      { label: 'Marcus on difficult people', text: 'How do I deal with someone who keeps getting under my skin?', voice: 'marcus-aurelius' },
      { label: 'Laozi on forcing things', text: 'I keep trying to force things to work out. How do I let go?', voice: 'laozi' },
      { label: 'William James on habits', text: 'How do I make a new habit actually stick?', voice: 'william-james' },
    ],
  },
  {
    title: 'Big questions',
    hint: 'Room to think out loud.',
    items: [
      { label: 'What makes a good life?', text: 'What does a good life actually look like?' },
      { label: 'Fear of death', text: 'How do I make peace with the fact that I’m going to die?' },
      { label: 'Am I happy?', text: 'How would I even know if I’m happy?', voice: 'russell' },
    ],
  },
];

/** Ideas for video scripts, shown when a video mode is chosen. */
export const VIDEO_GROUPS: SuggestionGroup[] = [
  {
    title: 'Short videos',
    hint: 'A 30–60 second script with three hooks to test, for TikTok, Reels or Shorts.',
    items: [
      { label: 'Gratitude when life is hard', text: 'Why gratitude matters most on the days it feels impossible', mode: 'short' },
      { label: 'The first 90 days', text: 'What nobody tells you about the first 90 days of recovery', mode: 'short' },
      { label: 'What’s in your control', text: 'The one question that stops spiralling: is this in my control?', mode: 'short', voice: 'stoic' },
      { label: 'Marcus Aurelius’ morning', text: 'How Marcus Aurelius started every morning, and how to steal it', mode: 'short', voice: 'marcus-aurelius' },
      { label: 'Seneca on wasted time', text: 'Seneca on why life feels short: we waste it', mode: 'short', voice: 'seneca' },
      { label: 'Cravings pass', text: 'A craving is a wave, not a command', mode: 'short' },
    ],
  },
  {
    title: 'YouTube videos',
    hint: 'A full 8–12 minute script with titles, thumbnail text, chapters and description.',
    items: [
      { label: 'Stoicism for recovery', text: 'Stoicism for people in recovery: five ideas that actually help', mode: 'youtube', voice: 'stoic' },
      { label: 'The science of gratitude', text: 'What William James knew about habit and gratitude that we forgot', mode: 'youtube' },
      { label: 'Ancient advice on anger', text: 'How to stop being so angry, according to Seneca', mode: 'youtube', voice: 'seneca' },
      { label: 'Living simply', text: 'What Thoreau learned at Walden about wanting less', mode: 'youtube', voice: 'thoreau' },
    ],
  },
];

/** A few for the quick row above the composer, per mode. */
export function quickSuggestions(mode: Mode): Suggestion[] {
  if (mode === 'short') return VIDEO_GROUPS[0].items;
  if (mode === 'youtube') return VIDEO_GROUPS[1].items;
  return QUICK_SUGGESTIONS;
}

const QUICK_SUGGESTIONS: Suggestion[] = [
  SUGGESTION_GROUPS[0].items[0],
  SUGGESTION_GROUPS[1].items[2],
  SUGGESTION_GROUPS[2].items[0],
  SUGGESTION_GROUPS[2].items[1],
  SUGGESTION_GROUPS[3].items[1],
  SUGGESTION_GROUPS[1].items[0],
];
