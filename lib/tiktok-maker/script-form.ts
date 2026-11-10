/**
 * lib/tiktok-maker/script-form.ts — the shape of the Grateful Today reference
 * scripts (DAY 01–11), as a check: generated scripts that don't match are
 * rejected and rewritten.
 */

export interface ScriptSentences {
  title: string;
  first: string;
  second: string;
}

// ─── The form of DAY 01–11 ───────────────────────────────────────────────────
// Measured from the reference scripts: sentence one 3–13 words, sentence two
// 4–17, together 15–24. Limits leave a little room either side.
const FIRST_MAX_WORDS = 14;
const SECOND_MAX_WORDS = 18;
const TOTAL_MIN_WORDS = 10;
const TOTAL_MAX_WORDS = 26;

/** The references never name the subject outright, never tell a scene, never preach. */
const FORBIDDEN: { pattern: RegExp; reason: string }[] = [
  { pattern: /\b(addict(ion|ed|s)?|sober|sobriety|drink(ing|s)?|drunk|alcohol|bottle|relapse|recovery|rehab|using)\b/i, reason: 'names the addiction outright — the references stay oblique' },
  { pattern: /\b(she|her|hers|my (wife|husband|mother|father|son|daughter|child|children|friend|partner))\b|^(someone|somebody)\b/i, reason: 'introduces a character or scene — the references are universal observations' },
  { pattern: /\b(coffee|kitchen|morning cup|table|door|phone|car|bed|room|window|mirror|street)\b/i, reason: 'uses a concrete prop or setting — the references are abstract' },
  { pattern: /\b(darkness|demons?|shadows?|broken|healing|heal|journey|light|stronger|new beginning|one step)\b/i, reason: 'uses a word the master prompt forbids' },
  { pattern: /["“”]|!|;|—/, reason: 'uses quotes, exclamation, semicolon or dash — the references use plain full stops' },
];

function words(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

/** Why a draft is off-form, or null when it matches DAY 01–11. */
export function formProblem(d: ScriptSentences): string | null {
  for (const s of [d.first, d.second]) {
    if (!/[.?]$/.test(s)) return 'each sentence must end with a full stop';
    if (/[.?!]\s+\S/.test(s)) return 'more than two sentences — the form is exactly two';
  }
  const a = words(d.first);
  const b = words(d.second);
  if (a > FIRST_MAX_WORDS) return `first sentence is ${a} words — keep it under ${FIRST_MAX_WORDS + 1}`;
  if (b > SECOND_MAX_WORDS) return `second sentence is ${b} words — keep it under ${SECOND_MAX_WORDS + 1}`;
  if (a + b < TOTAL_MIN_WORDS || a + b > TOTAL_MAX_WORDS) return `${a + b} words in total — the references are 15–24`;
  if (words(d.title) > 3) return 'title is more than three words';
  for (const f of FORBIDDEN) if (f.pattern.test(`${d.first} ${d.second}`)) return f.reason;
  return null;
}

