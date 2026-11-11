import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat, betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { getChunk, quoteAppearsIn, searchLibrary, type Chunk } from './library';
import { systemPrompt, userMessage } from './prompts';
import { addEntry, getNotes, passageFromChunk, recentEntries, updateNotes, type Entry, type Passage } from './store';
import { getVoice } from './voices';

const MODEL = 'claude-opus-5-5';
// On a policy decline, the API re-runs the request on a fallback model it picks.
const FALLBACK = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const };
// How many past exchanges go back to the model with each new entry.
const RECENT_IN_PROMPT = 6;
const RESULTS_PER_SEARCH = 8;

const client = new Anthropic();

const ModelReply = z.object({
  opening: z.string(),
  passages: z.array(z.object({ chunk_id: z.string(), quote: z.string(), why: z.string() })),
  closing: z.string(),
  remember: z.array(z.string()),
  forget: z.array(z.string()),
});

export interface AdviceResult {
  entry: Entry;
  notes: string[];
  /** Quotes the model offered that didn't match their source word for word, so weren't shown. */
  droppedQuotes: number;
}

function formatResult(c: Chunk): string {
  const cite = [c.author, c.work, c.translator && `trans. ${c.translator}`, c.location].filter(Boolean).join(', ');
  return `<passage id="${c.id}">\n${cite}\n\n${c.text}\n</passage>`;
}

export async function advise(uid: string, entryText: string, voiceId?: string): Promise<AdviceResult> {
  const voice = getVoice(voiceId);
  const [notes, recent] = await Promise.all([getNotes(uid), recentEntries(uid, RECENT_IN_PROMPT)]);

  // Passages the model has seen this turn: only these may be quoted.
  const seen = new Map<string, Chunk>();

  const searchTool = betaZodTool({
    name: 'search_library',
    description:
      'Searches the library of classic texts by keywords and returns matching passages with their ids and citations. ' +
      'Pass several short keyword queries, in the vocabulary of old translations. Passages already returned this turn are not repeated.' +
      (voice.authors.length ? ` Results are limited to: ${voice.authors.join(', ')}.` : ''),
    inputSchema: z.object({
      queries: z.array(z.string()).describe('One to four short keyword queries, e.g. ["gratitude benefits received", "thankful kindness repaid"].'),
    }),
    run: async ({ queries }) => {
      const results = searchLibrary(queries.slice(0, 4), { authors: voice.authors, limit: RESULTS_PER_SEARCH + seen.size })
        .filter((c) => !seen.has(c.id))
        .slice(0, RESULTS_PER_SEARCH);
      results.forEach((c) => seen.set(c.id, c));
      return results.length ? results.map(formatResult).join('\n\n') : 'No new passages matched. Try different words.';
    },
  });

  const message = await client.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    thread: false,
    max_iterations: 5,
    output_config: { effort: 'medium', format: betaZodOutputFormat(ModelReply) },
    system: systemPrompt(voice),
    tools: [searchTool],
    messages: [{ role: 'user', content: userMessage({ notes, recent, entry: entryText, now: new Date() }) }],
  });

  if (message.stop_reason === 'refusal') {
    throw new Error(`The model declined to reply (${message.stop_details?.category ?? 'no category'}).`);
  }
  const text = message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
  const parsed = ModelReply.safeParse(safeJson(text));
  if (!parsed.success) throw new Error(`The advisor's reply couldn't be read (stop_reason: ${message.stop_reason}).`);
  const out = parsed.data;

  // Show only quotes that appear word for word in a passage the model was actually given.
  const passages: Passage[] = [];
  let droppedQuotes = 0;
  for (const p of out.passages.slice(0, 3)) {
    const chunk = seen.get(p.chunk_id) ?? getChunk(p.chunk_id);
    if (chunk && seen.has(chunk.id) && quoteAppearsIn(p.quote, chunk.text)) {
      passages.push(passageFromChunk(chunk, p.quote.trim(), p.why.trim()));
    } else {
      droppedQuotes++;
      console.warn(`Advisor: dropped a quote that didn't match ${p.chunk_id}: ${p.quote.slice(0, 80)}`);
    }
  }

  const [entry, updatedNotes] = await Promise.all([
    addEntry(uid, {
      entry: entryText,
      voice: voice.id,
      reply: { opening: out.opening.trim(), passages, closing: out.closing.trim() },
    }),
    updateNotes(uid, out.remember, out.forget),
  ]);

  return { entry, notes: updatedNotes, droppedQuotes };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
