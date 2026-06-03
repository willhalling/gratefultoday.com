export type YouTubeVideoType =
  | 'gratitude-meditation'
  | 'sobriety-milestone'
  | 'morning-routine'
  | 'daily-affirmations'
  | 'recovery-tips'
  | 'gratitude-prompts'
  | 'recovery-milestone-markers'
  | 'morning-rituals'
  | 'gratitude-lists'
  | 'sobriety-reality-check'
  | 'breath-grounding'
  | 'abstract-metaphors'
  | 'time-of-day-meditation'
  | 'seasonal-reflection'
  | 'single-word-dive'
  | 'music-first-ambient'
  | 'question-series'
  | 'relapse-prevention-tools';

export interface TextOverlay {
  text: string;
  appearAt: string;
  duration: string;
}

export interface YouTubeScript {
  videoType: YouTubeVideoType;
  title: string;
  description: string;
  narrationStyle: 'full' | 'opening-only' | 'minimal' | 'none';
  openingNarration?: string;
  fullScript?: string;
  textOverlays?: TextOverlay[];
  reflectionPrompt?: string;
  midjourneyPrompt: string;
  musicNotes: string;
  tags: string[];
  duration: string;
  // Legacy fields for backward compatibility
  script?: string;
  elevenLabsNotes?: string;
}

export const VIDEO_TYPES: Record<
  YouTubeVideoType,
  { label: string; description: string; info: string }
> = {
  'gratitude-meditation': {
    label: 'Gratitude Meditation',
    description: 'Guided meditation focused on gratitude practice',
    info: 'Full narration • 5-10 min • Calming background • Guided reflection',
  },
  'sobriety-milestone': {
    label: 'Sobriety Milestone',
    description: 'Celebrating recovery milestones (30, 60, 90 days, 1 year)',
    info: 'Opening narration + text overlays • Celebratory yet grounded • Personal journey',
  },
  'morning-routine': {
    label: 'Morning Routine',
    description: 'Daily gratitude morning routine for recovery',
    info: 'Full narration • Morning visuals • Practical daily practice',
  },
  'daily-affirmations': {
    label: 'Daily Affirmations',
    description: 'Positive affirmations for sobriety and gratitude',
    info: 'Full narration • Repeating phrases • Meditative pacing',
  },
  'recovery-tips': {
    label: 'Recovery Tips',
    description: 'Practical tips for maintaining sobriety',
    info: 'Full narration • Educational • Actionable tools',
  },
  'gratitude-prompts': {
    label: 'Gratitude Prompts',
    description: 'Daily prompts for gratitude journaling',
    info: 'Minimal narration • Question-based • Space for reflection',
  },
  'recovery-milestone-markers': {
    label: 'Recovery Milestone Markers',
    description: 'Visual journey through recovery days: day 1, 7, 30, 90, 1 year',
    info: 'Text overlays • Ambient music • Abstract time-passing visuals • Contemplative',
  },
  'morning-rituals': {
    label: 'Morning Rituals',
    description: '5am coffee, first light, quiet before the world wakes',
    info: 'Opening narration or ambient • Morning scenes • Peaceful solitude',
  },
  'gratitude-lists': {
    label: 'Gratitude Lists',
    description: 'Three things today, small wins, what I noticed',
    info: 'Minimal narration • Simple enumeration • Nature close-ups • Pauses',
  },
  'sobriety-reality-check': {
    label: 'Sobriety Reality Check',
    description: "It's not always okay, hard days, still here anyway",
    info: 'Full narration • Honest talk • Permission to struggle • Raw and real',
  },
  'breath-grounding': {
    label: 'Breath/Grounding Exercise',
    description: '4-7-8 breathing, box breathing, just breathe',
    info: 'Opening instruction + text timing cues • Visual breath guides • Minimal talk',
  },
  'abstract-metaphors': {
    label: 'Abstract Metaphors',
    description: 'The cup, the plant, the river - objects as recovery metaphors',
    info: 'Poetic narration or pure visual • Metaphorical imagery • Reflective',
  },
  'time-of-day-meditation': {
    label: 'Time-of-Day Meditation',
    description: '3am thoughts, noon reset, evening release, midnight check-in',
    info: 'Flexible narration • Captures emotional tones • Time-specific visuals',
  },
  'seasonal-reflection': {
    label: 'Seasonal Reflection',
    description: 'Winter recovery, spring beginnings, summer solstice sober',
    info: 'Opening narration • Seasonal imagery • Natural cycles • Weather & light',
  },
  'single-word-dive': {
    label: 'Single Word Deep Dive',
    description: 'Patience, grace, enough, here, now - one concept explored',
    info: 'Full narration or repeated text • 5-10 min • Word in different contexts',
  },
  'music-first-ambient': {
    label: 'Music-First Ambient',
    description: 'Slowed classics, hymns reversed, ambient recovery soundscapes',
    info: 'No/minimal narration • Music is the content • Pure vibes + optional text',
  },
  'question-series': {
    label: 'Question Series',
    description: 'What are you carrying? What can you release? Who are you becoming?',
    info: 'Light intro + text questions • No answers • Space to think',
  },
  'relapse-prevention-tools': {
    label: 'Relapse Prevention Tools',
    description: 'Urge surfing, playing the tape forward, calling someone',
    info: 'Full narration • Practical teaching • Calm delivery • Actionable tools',
  },
};
