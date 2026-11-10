/**
 * lib/renderer/lyrics/phrase-split.ts — caps stored lyric phrases at a
 * readable size before any lyric mode sees them.
 *
 * Stored `lyricsLines` come from the transcription worker. For sung lyrics
 * they're short lines, but for speech (podcasts, voice-overs) WhisperX
 * returns whole spoken segments — 30+ words as one "line". Every mode then
 * tries to fit the entire segment on screen at once and shrinks it to an
 * unreadable block. This splits any over-long phrase into chunks that read
 * like subtitle lines, timed from the word timings, preferring (in order)
 * sentence ends, clause punctuation, then the longest pause.
 *
 * Normal lyric lines are well under the limits and pass through untouched.
 */
import type { WordTiming } from '@/lib/renderer/types';
import type { LyricPhrase } from '@/lib/renderer/vendor/slots/lyricPhrase';
import { hasCjkScript } from '@/lib/language-script';

/** A phrase longer than either limit is split. */
export const PHRASE_MAX_WORDS = 10;
export const PHRASE_MAX_CHARS = 60;
/** CJK has no spaces between words — cap by characters only. */
export const PHRASE_MAX_CHARS_CJK = 18;
/** Never leave a chunk shorter than this many words (except a lone tail). */
const MIN_CHUNK_WORDS = 2;

interface Token {
  text: string;
  start: number;
  end: number;
}

const SENTENCE_END = /[.!?…]["'”’)]*$/;
const CLAUSE_END = /[,;:—–-]["'”’)]*$/;

/** Words that open a new clause — a good place to break BEFORE. */
const CLAUSE_STARTERS = new Set([
  'and', 'but', 'or', 'so', 'because', 'when', 'while', 'which', 'who',
  'that', 'into', 'onto', 'toward', 'towards', 'through', 'with', 'without',
  'until', 'after', 'before', 'if', 'then', 'where', 'as',
]);
/** Words that lean on the next one — never break right AFTER these. */
const LEANING = new Set([
  'a', 'an', 'the', 'to', 'of', 'my', 'your', 'his', 'her', 'our', 'their',
  'its', 'this', 'that', 'these', 'those', 'in', 'on', 'at', 'for', 'from',
  'i', "i'm", "i've", "i'll", 'very', 'so',
]);

const bare = (w: string) => w.toLowerCase().replace(/[^a-z']/g, '');

function joinTokens(tokens: Token[], cjk: boolean): string {
  return tokens.map((t) => t.text).join(cjk ? '' : ' ');
}

function fits(tokens: Token[], cjk: boolean): boolean {
  const text = joinTokens(tokens, cjk);
  if (cjk) return text.length <= PHRASE_MAX_CHARS_CJK;
  return tokens.length <= PHRASE_MAX_WORDS && text.length <= PHRASE_MAX_CHARS;
}

/**
 * Best split index i (chunk = tokens[0..i), rest = tokens[i..)) scoring
 * sentence ends > clause punctuation > pause length, with a mild pull toward
 * the middle so chunks stay balanced.
 */
function bestSplit(tokens: Token[]): number {
  const n = tokens.length;
  let best = Math.ceil(n / 2);
  let bestScore = -Infinity;
  for (let i = MIN_CHUNK_WORDS; i <= n - MIN_CHUNK_WORDS; i++) {
    const prev = tokens[i - 1];
    const next = tokens[i];
    let score = 0;
    if (SENTENCE_END.test(prev.text)) score += 100;
    else if (CLAUSE_END.test(prev.text)) score += 50;
    if (CLAUSE_STARTERS.has(bare(next.text))) score += 25;
    if (LEANING.has(bare(prev.text))) score -= 60;
    const pause = Math.max(0, next.start - prev.end);
    score += Math.min(pause, 2) * 20;
    // Balance: penalise distance from the middle (in words).
    score -= Math.abs(i - n / 2) * 2;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

function splitTokens(tokens: Token[], cjk: boolean): Token[][] {
  if (fits(tokens, cjk) || tokens.length < MIN_CHUNK_WORDS * 2) return [tokens];
  const i = bestSplit(tokens);
  return [...splitTokens(tokens.slice(0, i), cjk), ...splitTokens(tokens.slice(i), cjk)];
}

/** Timed tokens for a phrase: its own text when it lines up 1:1 with the
 *  words inside its time range (keeps the phrase's punctuation/casing),
 *  else the words themselves, else evenly spaced text tokens. */
function phraseTokens(phrase: LyricPhrase, words: WordTiming[], cjk: boolean): Token[] {
  const inside = words.filter(
    (w) => w.start >= phrase.start - 0.05 && w.start < phrase.end + 0.05,
  );
  const textParts = cjk ? Array.from(phrase.text.replace(/\s+/g, '')) : phrase.text.split(/\s+/).filter(Boolean);
  if (inside.length > 0 && inside.length === textParts.length) {
    return inside.map((w, i) => ({ text: textParts[i], start: w.start, end: w.end }));
  }
  if (inside.length > 0) {
    return inside.map((w) => ({ text: w.word, start: w.start, end: w.end }));
  }
  const span = Math.max(0.001, phrase.end - phrase.start);
  const step = span / Math.max(1, textParts.length);
  return textParts.map((text, i) => ({
    text,
    start: phrase.start + i * step,
    end: phrase.start + (i + 1) * step,
  }));
}

export function splitLongPhrases(
  phrases: LyricPhrase[],
  words: WordTiming[] | undefined,
): LyricPhrase[] {
  const timed = (words ?? []).filter((w) => w.reliable !== false && !w.hidden);
  const out: LyricPhrase[] = [];
  for (const phrase of phrases) {
    const cjk = hasCjkScript(phrase.text);
    // Outro phrases and short lines are left exactly as authored.
    if (phrase.isEndPhrase) {
      out.push(phrase);
      continue;
    }
    const tokens = phraseTokens(phrase, timed, cjk);
    if (tokens.length === 0 || fits(tokens, cjk)) {
      out.push(phrase);
      continue;
    }
    const chunks = splitTokens(tokens, cjk);
    if (chunks.length === 1) {
      out.push(phrase);
      continue;
    }
    chunks.forEach((chunk, i) => {
      const text = joinTokens(chunk, cjk);
      const start = i === 0 ? phrase.start : chunk[0].start;
      const end = i === chunks.length - 1 ? phrase.end : chunks[i + 1][0].start;
      out.push({
        ...phrase,
        text,
        start,
        end: Math.max(end, start + 0.05),
        // Emphasis words only carry into the chunk that contains them.
        highlight: phrase.highlight?.filter((h) =>
          text.toLowerCase().includes(h.toLowerCase()),
        ),
      });
    });
  }
  return out;
}
