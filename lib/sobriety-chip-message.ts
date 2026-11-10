/**
 * The words shown (and, for the original story, spoken) in a chip's 20-second video.
 * People start from the milestone's story or a tone preset and can rewrite it freely.
 */

/** Roughly what reads comfortably as captions in the 17 seconds before the close. */
export const MESSAGE_MAX_WORDS = 45;
export const MESSAGE_MAX_CHARS = 300;

export interface MessageTone {
  id: string;
  label: string;
  text: string;
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function normalise(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/** True when the words differ from the milestone's narrated story. */
export function isCustomMessage(text: string, storyText: string): boolean {
  return normalise(text) !== normalise(storyText);
}

/** `milestone` is how the chip reads, e.g. "1 week" or "90 days". */
export function getMessageTones(milestone: string, storyText: string): MessageTone[] {
  const m = milestone.toLowerCase();
  return [
    { id: 'story', label: 'Original story', text: storyText },
    {
      id: 'simple',
      label: 'Short and simple',
      text: `${m}. one day at a time, and you showed up for every one of them. proud of you.`,
    },
    {
      id: 'sponsor',
      label: 'From a sponsor',
      text: `${m}. i've watched you show up, even on the days it was hard. keep coming back. it works if you work it.`,
    },
    {
      id: 'family',
      label: 'From family',
      text: `${m}. we see how hard you've worked, and we're so proud of you. we love you. here's to the next day.`,
    },
    {
      id: 'self',
      label: 'For myself',
      text: `${m}. i didn't think i could do this. one choice at a time, i did. i'm still here, and i'm grateful.`,
    },
  ];
}
