import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat, betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { getChunk, quoteAppearsIn, searchLibrary, type Chunk } from './library';
import { systemPrompt, userMessage } from './prompts';
import { semanticSearch, semanticSearchAvailable } from './semantic';
import { addEntry, getNotes, passageFromChunk, recentEntries, updateNotes, type Entry, type Passage } from './store';
import { getVoice, type Voice } from './voices';

const MODEL = 'claude-opus-5-5';
// On a policy decline, the API re-runs the request on a fallback model it picks.
const FALLBACK = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const };
// How many past exchanges go back to the model with each new entry.
const RECENT_IN_PROMPT = 6;
// Passages handed to the model when they're found up front (semantic search).
const PASSAGES_GIVEN = 14;
// Passages per call of the search tool (fallback path).
const RESULTS_PER_SEARCH = 8;

const client = new Anthropic();

// Field order matters: "opening" comes first so it can be shown while the rest is written.
const ModelReply = z.object({
  opening: z.string(),
  passages: z.array(z.object({ chunk_id: z.string(), quote: z.string(), why: z.string() })),
  closing: z.string(),
  remember: z.array(z.string()),
  forget: z.array(z.string()),
});
type ModelReply = z.infer<typeof ModelReply>;

export interface AdviceResult {
  entry: Entry;
  notes: string[];
  /** Quotes the model offered that didn't match their source word for word, so weren't shown. */
  droppedQuotes: number;
}

/** Live progress while the advisor works, for the page to show. */
export type AdviceProgress =
  | { type: 'retrieved'; found: number }
  | { type: 'search'; queries: string[]; found: number }
  | { type: 'opening'; text: string };

type Progress = ((p: AdviceProgress) => void) | undefined;

function formatPassage(c: Chunk): string {
  const cite = [c.author, c.work, c.translator && `trans. ${c.translator}`, c.location].filter(Boolean).join(', ');
  return `<passage id="${c.id}">\n${cite}\n\n${c.text}\n</passage>`;
}

export async function advise(uid: string, entryText: string, voiceId?: string, onProgress?: Progress): Promise<AdviceResult> {
  const voice = getVoice(voiceId);
  const [notes, recent] = await Promise.all([getNotes(uid), recentEntries(uid, RECENT_IN_PROMPT)]);
  const context = { notes, recent, entry: entryText, now: new Date() };

  // Fast path: find passages by meaning first, then one streamed call.
  // Without embeddings (or if that search fails) the model searches with a tool instead.
  let result: { reply: ModelReply; offered: Map<string, Chunk> } | null = null;
  if (semanticSearchAvailable()) {
    try {
      // A very short entry ("following up on yesterday") searches with the last one too.
      const query = entryText.split(/\s+/).length < 12 && recent[0] ? `${recent[0].entry}\n\n${entryText}` : entryText;
      const found = await semanticSearch(query, { authors: voice.authors, limit: PASSAGES_GIVEN });
      onProgress?.({ type: 'retrieved', found: found.length });
      result = await replyWithPassages(voice, context, found, onProgress);
    } catch (e) {
      if (e instanceof Anthropic.APIError) throw e;
      console.error('Advisor: semantic search failed, falling back to the search tool', e);
    }
  }
  result ??= await replyWithSearch(voice, context, onProgress);

  // Show only quotes that appear word for word in a passage the model was actually given.
  const passages: Passage[] = [];
  let droppedQuotes = 0;
  for (const p of result.reply.passages.slice(0, 3)) {
    const chunk = result.offered.get(p.chunk_id) ?? getChunk(p.chunk_id);
    if (chunk && result.offered.has(chunk.id) && quoteAppearsIn(p.quote, chunk.text)) {
      passages.push(passageFromChunk(chunk, p.quote.trim(), p.why.trim()));
    } else {
      droppedQuotes++;
      console.warn(`Advisor: dropped a quote that didn't match ${p.chunk_id}: ${p.quote.slice(0, 80)}`);
    }
  }

  const out = result.reply;
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

/** One streamed call with the passages in the prompt. Sends the opening as it's written. */
async function replyWithPassages(
  voice: Voice,
  context: Parameters<typeof userMessage>[0],
  found: Chunk[],
  onProgress: Progress,
): Promise<{ reply: ModelReply; offered: Map<string, Chunk> }> {
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    output_config: { effort: 'low', format: betaZodOutputFormat(ModelReply) },
    system: systemPrompt(voice, 'given'),
    messages: [{ role: 'user', content: userMessage({ ...context, passages: found.map(formatPassage).join('\n\n') }) }],
  });

  let json = '';
  let shown = '';
  stream.on('text', (delta) => {
    json += delta;
    const opening = partialString(json, 'opening');
    if (opening && opening !== shown) {
      shown = opening;
      onProgress?.({ type: 'opening', text: opening });
    }
  });

  const message = await stream.finalMessage();
  return { reply: parseReply(message), offered: new Map(found.map((c) => [c.id, c])) };
}

/** The tool-search loop: the model writes its own keyword searches, then replies. */
async function replyWithSearch(
  voice: Voice,
  context: Parameters<typeof userMessage>[0],
  onProgress: Progress,
): Promise<{ reply: ModelReply; offered: Map<string, Chunk> }> {
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
      onProgress?.({ type: 'search', queries, found: results.length });
      return results.length ? results.map(formatPassage).join('\n\n') : 'No new passages matched. Try different words.';
    },
  });

  const message = await client.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    thread: false,
    max_iterations: 5,
    output_config: { effort: 'medium', format: betaZodOutputFormat(ModelReply) },
    system: systemPrompt(voice, 'search'),
    tools: [searchTool],
    messages: [{ role: 'user', content: userMessage(context) }],
  });
  return { reply: parseReply(message), offered: seen };
}

function parseReply(message: Anthropic.Beta.BetaMessage): ModelReply {
  if (message.stop_reason === 'refusal') {
    throw new Error(`The model declined to reply (${message.stop_details?.category ?? 'no category'}).`);
  }
  const text = message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
  let raw: unknown = null;
  try {
    raw = JSON.parse(text);
  } catch {}
  const parsed = ModelReply.safeParse(raw);
  if (!parsed.success) throw new Error(`The advisor's reply couldn't be read (stop_reason: ${message.stop_reason}).`);
  return parsed.data;
}

/**
 * The value of a string field from JSON that is still arriving, e.g. the
 * opening while the rest of the reply is being written. Null until it starts.
 */
export function partialString(json: string, field: string): string | null {
  const m = json.match(new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)`));
  if (!m) return null;
  // Drop a trailing escape that hasn't finished arriving (\ or \u12).
  const body = m[1].replace(/\\(u[0-9a-fA-F]{0,3})?$/, '');
  try {
    return JSON.parse(`"${body}"`);
  } catch {
    return null;
  }
}
