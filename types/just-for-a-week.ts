export interface WeekJourneyUser {
  uid: string;
  email: string;
  startDate: string; // ISO date when they signed up
  completedDays: number[]; // [1, 2, 3, etc.]
  videoUrl?: string; // Generated video after day 7
  timezone?: string; // IANA timezone, e.g. "America/Los_Angeles"
  preferredHour?: number; // 0-23, default 8
  lastSentDaySent?: number; // last day email sent (1..7)
  lastSentLocalDate?: string; // YYYY-MM-DD in user's timezone of last send
  createdAt: string;
  updatedAt: string;
}

export interface DayResponse {
  day: number;
  prompt: string;
  response: string;
  submittedAt: string;
}

export interface WeekJourneyData {
  user: WeekJourneyUser;
  responses: DayResponse[];
}

export const DAY_PROMPTS = {
  1: {
    title: 'Right Now',
    prompt: 'List 3 things you\'re grateful for in this exact moment.',
    placeholder: 'What\'s here, right now, that you can appreciate?',
  },
  2: {
    title: 'Someone Who Showed Up',
    prompt: 'Think of one person who showed up for you in your recovery journey.',
    placeholder: 'Who was there when you needed them?',
  },
  3: {
    title: 'Small Wins',
    prompt: 'List 5 small things that went right today.',
    placeholder: 'The tiny victories count too...',
  },
  4: {
    title: 'Your Body',
    prompt: 'What is your body doing for you today that you\'re grateful for?',
    placeholder: 'Your breath, your movement, your healing...',
  },
  5: {
    title: 'A Place',
    prompt: 'Describe a place that brings you peace or comfort.',
    placeholder: 'Where do you feel safe?',
  },
  6: {
    title: 'Something You Learned',
    prompt: 'What has recovery taught you that you\'re grateful to know?',
    placeholder: 'What wisdom came from the hard times?',
  },
  7: {
    title: 'Looking Forward',
    prompt: 'What are you looking forward to in your continued journey?',
    placeholder: 'What\'s waiting for you ahead?',
  },
} as const;
