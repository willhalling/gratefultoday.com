import { WeekJourneyPreviewClient } from '@/components/weekjourney/WeekJourneyPreviewClient';
import type { DayResponse } from '@/types/just-for-a-week';
import { DAY_PROMPTS } from '@/types/just-for-a-week';

// Server component wrapper; feeds sample props for now.
export default function Page() {
  // Demo data for all 7 days, using the canonical prompts
  const sampleResponses: DayResponse[] = Array.from({ length: 7 }, (_, i) => {
    const day = i + 1;
    const { prompt } = DAY_PROMPTS[day as 1 | 2 | 3 | 4 | 5 | 6 | 7];
    const canned: Record<number, string> = {
      1: 'The sun on my face, a text from a friend, and the quiet in my room.',
      2: 'My sponsor, who picked up the phone when I needed them most.',
      3: 'Made my bed, took my meds, walked 10 minutes, drank water, and replied to a message.',
      4: 'My lungs breathing steadily and my legs carrying me through the day.',
      5: 'A corner of my home where I feel calm and safe.',
      6: 'That I can pause before reacting — a gift from recovery.',
      7: 'Feeling hopeful about tomorrow and the small steps I’ll take.',
    };
    return {
      day,
      prompt,
      response: canned[day],
      submittedAt: new Date().toISOString(),
    };
  });

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-neutral-900 mb-2">Your Week Journey Video</h1>
          <p className="text-neutral-600 mb-8">
            Preview your 7-day journey and download a personalized video.
          </p>
          <div className="flex flex-col items-center gap-4">
            <WeekJourneyPreviewClient responses={sampleResponses} userEmail="demo@example.com" />
            <p className="text-sm text-neutral-500 text-center">
              This is a demo preview. Your real video will include your submitted responses.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
