/**
 * Lyric phrase data type — extracted from the former
 * remotion/slots/AnimatedLyricsSlot.tsx so framework-free consumers
 * (lib/renderer) never imported the React slot component.
 */

/** Mirrors the firebase lyricsLines schema — plain seconds, no frames. */
export interface LyricPhrase {
  text: string;
  start: number; // seconds
  end: number;   // seconds
  /** Optional 1-2 words to visually emphasise, as returned by the grouping AI. */
  highlight?: string[];
  /** When true, user-adjusted timing is treated as authoritative during render. */
  timingLocked?: boolean;
  /** True for the single optional end/outro phrase appended after the song. */
  isEndPhrase?: boolean;
}
