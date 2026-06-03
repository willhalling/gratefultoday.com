import React from 'react';
import { Composition } from 'remotion';
import { SlowedReverbComposition } from './SlowedReverbComposition';
import { WeekJourneyComposition } from './WeekJourneyComposition';
import { MilestoneComposition } from './MilestoneComposition';
import type { DayResponse } from '../types/just-for-a-week';

// Mock data for testing Week Journey
const mockResponses: DayResponse[] = [
  {
    day: 1,
    prompt: "What feels good right now?",
    response: "The warmth of my morning coffee and the quiet before the day begins.",
    submittedAt: new Date().toISOString(),
  },
  {
    day: 2,
    prompt: "Someone who showed up for you",
    response: "My friend called just when I needed to talk. Perfect timing.",
    submittedAt: new Date().toISOString(),
  },
  {
    day: 3,
    prompt: "A small win today",
    response: "I finished that project I had been putting off for weeks.",
    submittedAt: new Date().toISOString(),
  },
  {
    day: 4,
    prompt: "Something your body did well",
    response: "My legs carried me through a beautiful morning walk without pain.",
    submittedAt: new Date().toISOString(),
  },
  {
    day: 5,
    prompt: "A place that feels safe",
    response: "My reading corner by the window, where everything slows down.",
    submittedAt: new Date().toISOString(),
  },
  {
    day: 6,
    prompt: "Something you learned",
    response: "I learned that asking for help is a strength, not a weakness.",
    submittedAt: new Date().toISOString(),
  },
  {
    day: 7,
    prompt: "What you're looking forward to",
    response: "Tomorrow's sunrise and the possibility of another good day.",
    submittedAt: new Date().toISOString(),
  },
];

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="WeekJourney"
        component={WeekJourneyComposition}
        durationInFrames={2400} // 80 seconds at 30fps
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          responses: mockResponses,
          userEmail: 'test@example.com',
        }}
      />
      <Composition
        id="SlowedReverb"
        component={SlowedReverbComposition}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          imageUrl: 'https://via.placeholder.com/500',
          audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        }}
      />
      <Composition
        id="Milestone24Hours"
        component={MilestoneComposition}
        durationInFrames={180} // 6 seconds at 30fps
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          hours: 24,
          subtitle: 'Keep going. One day at a time.',
          showCaptions: false,
        }}
      />
      <Composition
        id="Milestone24HoursWithCaptions"
        component={MilestoneComposition}
        durationInFrames={1350} // 45 seconds at 30fps for full script
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          hours: 24,
          showCaptions: true,
          audioUrl: '/audio/milestone-24h.mp3',
        }}
      />
    </>
  );
};
