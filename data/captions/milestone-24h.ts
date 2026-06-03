/**
 * Caption data for 24 Hours Sober milestone video
 * Script with timing information
 */

import type { CaptionData } from '../../lib/remotion/caption-types';

export const milestone24hCaptions: CaptionData = {
  totalDuration: 60, // 60 seconds
  audioUrl: '/audio/milestone-24h.mp3', // Placeholder - will be replaced with actual TTS
  segments: [
    {
      id: 'segment-1',
      text: 'you\nsigned up\nyesterday',
      startTime: 0,
      endTime: 3.5,
      pauseAfter: 0.8,
    },
    {
      id: 'segment-2',
      text: 'why?',
      startTime: 4.3,
      endTime: 5.5,
      pauseAfter: 1.5,
    },
    {
      id: 'segment-3',
      text: 'because something\nhad to\nchange',
      startTime: 7.0,
      endTime: 10.5,
      pauseAfter: 0.8,
    },
    {
      id: 'segment-4',
      text: 'because waking up\nthinking about\nwhat\'s wrong\nwhat\'s missing\nwhat hurts\nwas becoming\nyour whole life',
      startTime: 11.3,
      endTime: 20.0,
      pauseAfter: 0.8,
    },
    {
      id: 'segment-5',
      text: 'so you tried\nsomething different',
      startTime: 20.8,
      endTime: 23.5,
      pauseAfter: 0.8,
    },
    {
      id: 'segment-6',
      text: 'you said\n"maybe\nif i notice\nwhat\'s okay\neven just one thing\nevery morning\nmaybe\nthat changes\nsomething"',
      startTime: 24.3,
      endTime: 35.0,
      pauseAfter: 0.8,
    },
    {
      id: 'segment-7',
      text: 'today is day 1\nof finding out\nif you were right',
      startTime: 35.8,
      endTime: 41.0,
      pauseAfter: 1.5,
    },
    {
      id: 'segment-8',
      text: 'grateful today',
      startTime: 42.5,
      endTime: 45.0,
    },
  ],
};
