import Anthropic from '@anthropic-ai/sdk';
import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { rejectNonAdmin } from '@/lib/tiktok-maker/admin-auth';
import type { GeneratedScript } from '@/lib/tiktok-maker/bulk';
import { formProblem, type ScriptSentences } from '@/lib/tiktok-maker/script-form';
import { saveRejectedDrafts, saveScripts } from '@/lib/tiktok-maker/library-server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const PROMPT_PATH = path.join(process.cwd(), 'prompts', 'grateful-today-scripts.md');
const MAX_COUNT = 20;
/** Write → check → rewrite the rejects, at most this many rounds. */
const MAX_ROUNDS = 3;

interface PreviousEpisode {
  day: number;
  title: string;
  text: string;
}

interface Draft extends ScriptSentences {
  firstTag: string;
  secondTag: string;
  pauseTag: string;
}

/** Same layout as the brief's example: tagged sentence, pause line, tagged sentence. */
function toScript(d: Draft): string {
  return `${d.firstTag} ${d.first}\n\n${d.pauseTag}\n\n${d.secondTag} ${d.second}`;
}

const tag = (t: unknown, fallback: string) => {
  const s = typeof t === 'string' ? t.trim() : '';
  const inner = s.replace(/^\[|\]$/g, '').trim();
  return inner && /^[a-z ]{2,24}$/i.test(inner) ? `[${inner.toLowerCase()}]` : fallback;
};

function contract(count: number, direction: string, previous: PreviousEpisode[], rejected: string[]): string {
  const prior = previous.length
    ? `Episodes already written after DAY 11 — continue from them and do not repeat their ideas:\n${previous
        .map((p) => `DAY ${String(p.day).padStart(2, '0')} — ${p.title}\n${p.text}`)
        .join('\n')}\n\n`
    : '';
  const redo = rejected.length
    ? `\nThese drafts were rejected — do not reuse them or their ideas:\n${rejected.join('\n')}\n`
    : '';
  return `${prior}Write ${count} new script${count === 1 ? '' : 's'}.${direction ? `\nDirection for this batch: ${direction}` : ''}
${redo}
THE FORM — every script must be indistinguishable in shape from DAY 01–11:
- Exactly two sentences. No more.
- Sentence one: a plain, general claim about something abstract (a feeling, time, the past, conscience, death, silence, memory, a habit of mind). 3–13 words.
- Sentence two: turns, deepens or quietly contradicts sentence one. Often it opens with "It", "But", "And", "Now", "What", "We" or "I". 4–17 words.
- 15–24 words in total.
- Universal, not anecdotal: no scenes, no other people, no objects, places or times of day. "A man" or "we" is the furthest it goes; "I" in at most a third of the batch.
- Plain words and full stops only. No dashes, semicolons, quotes, exclamations, metaphors piled on metaphors.
- Never name addiction, drinking, sobriety or recovery — the references never do; the subject is felt, not stated.
- Title: one or two words in capitals, usually an abstract noun (MEMORY, THE VOID).
Before answering, compare each script to DAY 01–11 and replace any that would look out of place among them.

Each is voiced by ElevenLabs v3. Give each sentence one delivery tag (e.g. softly, quietly, sadly, wearily, flatly) and choose the silence between them (pause or long pause).

Return ONLY a JSON array, no prose and no code fences:
[{"title": "MEMORY", "first": "The mind is merciful in what it allows us to forget.", "second": "Conscience is less generous.", "firstTag": "softly", "pauseTag": "long pause", "secondTag": "sadly"}]`;
}

function parseDrafts(text: string): Draft[] {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end <= start) throw new Error('The model did not return a JSON array.');
  const raw = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>[];
  return raw
    .filter((r) => typeof r?.title === 'string' && typeof r.first === 'string' && typeof r.second === 'string')
    .map((r) => ({
      title: (r.title as string).trim().toUpperCase(),
      first: (r.first as string).trim(),
      second: (r.second as string).trim(),
      firstTag: tag(r.firstTag, '[softly]'),
      secondTag: tag(r.secondTag, '[quietly]'),
      pauseTag: tag(r.pauseTag, '[long pause]'),
    }));
}

async function writeDrafts(system: string, prompt: string): Promise<Draft[]> {
  // `fallbacks` (server-side refusal fallback) is newer than this SDK's types.
  const params = {
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'high' as const },
    system,
    messages: [{ role: 'user' as const, content: prompt }],
  };
  const response = await anthropic.beta.messages.create(params as Anthropic.Beta.Messages.MessageCreateParamsNonStreaming);
  if (response.stop_reason === 'refusal') throw new Error('The model declined this request — try a different direction.');
  return parseDrafts(response.content.map((b) => (b.type === 'text' ? b.text : '')).join(''));
}

export async function POST(req: NextRequest) {
  const rejectedAuth = await rejectNonAdmin(req);
  if (rejectedAuth) return rejectedAuth;

  const body = (await req.json().catch(() => ({}))) as {
    count?: number;
    startDay?: number;
    direction?: string;
    previous?: PreviousEpisode[];
  };
  const count = Math.max(1, Math.min(MAX_COUNT, Math.floor(body.count ?? 5)));
  const startDay = Math.max(1, Math.floor(body.startDay ?? 12));
  const direction = (body.direction ?? '').trim().slice(0, 1000);
  const previous = Array.isArray(body.previous) ? body.previous.slice(-60) : [];

  try {
    const system = await fs.readFile(PROMPT_PATH, 'utf8');
    const accepted: Draft[] = [];
    const rejected: string[] = [];
    for (let round = 0; round < MAX_ROUNDS && accepted.length < count; round++) {
      const keptSoFar = accepted.map((d, i) => ({ day: startDay + i, title: d.title, text: `${d.first} ${d.second}` }));
      const drafts = await writeDrafts(system, contract(count - accepted.length, direction, [...previous, ...keptSoFar], rejected));
      for (const d of drafts) {
        if (accepted.length >= count) break;
        const problem = formProblem(d);
        const dupe = accepted.some((a) => a.first.toLowerCase() === d.first.toLowerCase());
        if (problem || dupe) rejected.push(`"${d.first} ${d.second}" — ${problem ?? 'duplicate'}`);
        else accepted.push(d);
      }
    }
    if (accepted.length === 0) throw new Error('No script matched the DAY 01–11 form — try again or adjust the direction.');
    const scripts: GeneratedScript[] = accepted.map((d, i) => ({ day: startDay + i, title: d.title, script: toScript(d) }));
    // Saved before they're returned: a closed tab can't lose a paid-for batch.
    try {
      const [records] = await Promise.all([
        saveScripts(scripts, { source: 'generated', direction }),
        saveRejectedDrafts(rejected, direction),
      ]);
      return NextResponse.json({ scripts: records, rejected: rejected.length });
    } catch (saveError) {
      // Still hand the batch back (the client retries the save) rather than lose it.
      console.error('[tiktok-maker/scripts] save failed:', saveError);
      return NextResponse.json({ scripts, rejected: rejected.length, saveError: 'Scripts could not be saved to the library.' });
    }
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error('[tiktok-maker/scripts] Anthropic error:', error.status, error.message);
      return NextResponse.json({ error: `Claude API error ${error.status}: ${error.message}` }, { status: 502 });
    }
    console.error('[tiktok-maker/scripts] failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Script generation failed.' }, { status: 500 });
  }
}
