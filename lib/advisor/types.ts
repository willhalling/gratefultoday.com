/** Types shared by the advisor's server code and its page (no server-only imports here). */

/** What the advisor writes: a journal reply, or a script for short or long video. */
export type Mode = 'reflect' | 'short' | 'youtube';

export interface Passage {
  chunkId: string;
  quote: string;
  why: string;
  author: string;
  work: string;
  translator: string | null;
  location: string | null;
  source: string;
}

export interface Reply {
  opening: string;
  passages: Passage[];
  closing: string;
}

/** One moment of a short video: what's said, what's on screen, what's shown. */
export interface Beat {
  voiceover: string;
  onScreen: string;
  visual: string;
}

/** A 30–60 second vertical video: TikTok, Instagram Reels, YouTube Shorts. */
export interface ShortScript {
  kind: 'short';
  title: string;
  hooks: { text: string; style: string }[];
  beats: Beat[];
  cta: string;
  caption: string;
  hashtags: string[];
  /** The quotes used, verified against the library. Already written into the beats. */
  passages: Passage[];
}

/** A long-form YouTube video. */
export interface YouTubeScript {
  kind: 'youtube';
  hook: string;
  sections: { heading: string; voiceover: string; onScreen: string }[];
  outro: string;
  titles: string[];
  thumbnailText: string[];
  description: string;
  chapters: { time: string; title: string }[];
  tags: string[];
  passages: Passage[];
}

export type Script = ShortScript | YouTubeScript;

export interface Entry {
  id: string;
  /** What was written: a journal entry, or the video's topic. */
  entry: string;
  voice: string;
  /** Missing on entries from before modes existed, which are all 'reflect'. */
  mode?: Mode;
  reply?: Reply;
  script?: Script;
  createdAt: string;
}

export interface SavedPassage extends Passage {
  note: string;
  savedAt: string;
}
