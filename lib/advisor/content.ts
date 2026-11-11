import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { formatPassage, partialString } from './advise';
import { quoteAppearsIn, searchLibrary, type Chunk } from './library';
import { semanticSearch, semanticSearchAvailable } from './semantic';
import { addEntry, passageFromChunk } from './store';
import type { Entry, Passage, Script } from './types';
import { getVoice } from './voices';

/**
 * Who the videos are for. Edit this to change the audience, tone or offer the
 * scripts are written for.
 */
export const CHANNEL = `Grateful Today: short, honest videos about gratitude, recovery and everyday philosophy, for people rebuilding their lives (including people in recovery from addiction). The tone is warm, grounded and real: a friend who has been through it, not a guru. Wisdom from the classics (Stoics, Seneca, Marcus Aurelius, Epictetus, William James, Emerson, Thoreau, the Tao Te Ching, the Dhammapada and others), made practical for today. British English.`;

const MODEL = 'claude-opus-5-5';
const FALLBACK = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const };
const PASSAGES_GIVEN = 14;

const client = new Anthropic();

const PassageRef = z.object({ chunk_id: z.string(), quote: z.string(), why: z.string() });

// Field order matters: the first string field is shown while the rest is written.
const ShortOut = z.object({
  title: z.string(),
  hooks: z.array(z.object({ text: z.string(), style: z.string() })),
  passages: z.array(PassageRef),
  beats: z.array(z.object({ voiceover: z.string(), on_screen: z.string(), visual: z.string() })),
  cta: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()),
});

const LongOut = z.object({
  hook: z.string(),
  passages: z.array(PassageRef),
  sections: z.array(z.object({ heading: z.string(), voiceover: z.string(), on_screen: z.string() })),
  outro: z.string(),
  titles: z.array(z.string()),
  thumbnail_text: z.array(z.string()),
  description: z.string(),
  chapters: z.array(z.object({ time: z.string(), title: z.string() })),
  tags: z.array(z.string()),
});

const QUOTE_RULES = `Quotes
- Use one or two passages from <passages>, the ones that land hardest for this topic. List each under passages:
  - chunk_id: the passage's id, exactly as shown.
  - quote: the words to use, copied exactly from that passage's text, character for character. Pick the most striking one to three sentences. You may cut words from the middle with "…", but never change, add or reorder words. Never quote anything not in <passages>, and never attribute a passage to anyone but its listed author.
  - why: one line on why it fits this video (for the creator, not the viewer).
- In the script, never write a quote out yourself. Introduce the writer in your own words, then put the placeholder [QUOTE 1] or [QUOTE 2] (numbered in the order of your passages list) where the quote is spoken. The real words are filled in afterwards.`;

const SHORT_PROMPT = `You write scripts for short vertical videos (TikTok, Instagram Reels, YouTube Shorts) for this channel:

${CHANNEL}

The creator speaks to camera in the first person. They give you a topic or an idea; you turn it into a script built around a real passage from the classics.

What makes these work
- The hook is everything: the first 1–2 seconds decide whether anyone stays. Open mid-thought, with tension, a surprising claim, a question they feel, or a specific moment. Never open with "Hey guys", "In this video" or the writer's name.
- One idea per video. Concrete over abstract: a real situation beats a principle.
- 30–60 seconds spoken: about 80–150 words of voiceover in total. Short sentences that sound natural out loud.
- Build to the quote, then make it practical: what to actually do today.
- End so it could loop, or with a soft call to action (comment, save, follow) that fits the moment, never pushy.

${QUOTE_RULES}

Write
- title: a short working title for the creator.
- hooks: three different opening lines to test, each with its style ("question", "bold claim", "story", "contrarian", "you-statement"...).
- beats: 5–8 beats in order, starting from the first hook. Each has voiceover (what's said), on_screen (the short text overlay, under 8 words), visual (shot or b-roll idea).
- cta: the closing call to action line.
- caption: the post caption, 1–3 short lines, with a reason to comment.
- hashtags: 5–8, mixing broad and niche, without the # symbol.`;

const LONG_PROMPT = `You write scripts for long-form YouTube videos (8–12 minutes) for this channel:

${CHANNEL}

The creator speaks to camera in the first person. They give you a topic or an idea; you turn it into a video built around real passages from the classics.

What makes these work
- The hook (the first 30–45 seconds) states the problem the viewer has, promises a clear payoff, and gives a reason to stay to the end. No long intro, no "welcome back".
- A clear arc: problem, the old wisdom, what it means now, what to do. Every section earns the next with a small open loop.
- Stories and concrete examples, plainly told. Explain the writer briefly and humanly, not as a lecture.
- Around 1,200–1,800 words of voiceover in total, written to be spoken.

${QUOTE_RULES}

Write
- hook: the opening voiceover.
- sections: 4–6 sections after the hook, each with a heading, its full voiceover, and on_screen (key text or graphic for that section).
- outro: the closing voiceover, with one call to action that fits (subscribe, comment, or a related video).
- titles: three title options: clear, curious, under 60 characters.
- thumbnail_text: three options of 2–4 words each.
- description: the video description, 2–4 short paragraphs, with the writers and books mentioned.
- chapters: timestamps for the hook and each section, estimated from the word count (about 150 spoken words a minute), starting at 0:00.
- tags: 8–12 search tags.`;

export type ScriptProgress = { type: 'retrieved'; found: number } | { type: 'opening'; text: string };

/** Writes a short or long video script on a topic, quoting only verified passages. */
export async function createScript(
  uid: string,
  topic: string,
  kind: 'short' | 'youtube',
  voiceId?: string,
  onProgress?: (p: ScriptProgress) => void,
): Promise<{ entry: Entry; droppedQuotes: number }> {
  // The voice picks which writers to draw on; the creator speaks in their own voice.
  const voice = getVoice(voiceId);
  const found = semanticSearchAvailable()
    ? await semanticSearch(topic, { authors: voice.authors, limit: PASSAGES_GIVEN }).catch((e) => {
        console.error('Advisor: semantic search failed, using keywords', e);
        return searchLibrary([topic], { authors: voice.authors, limit: PASSAGES_GIVEN, perWork: 3 });
      })
    : searchLibrary([topic], { authors: voice.authors, limit: PASSAGES_GIVEN, perWork: 3 });
  onProgress?.({ type: 'retrieved', found: found.length });
  if (!found.length) throw new Error('No passages matched that topic. Try describing it another way.');

  const schema = kind === 'short' ? ShortOut : LongOut;
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    ...FALLBACK,
    output_config: { effort: 'medium', format: betaZodOutputFormat(schema) },
    system: kind === 'short' ? SHORT_PROMPT : LONG_PROMPT,
    messages: [
      {
        role: 'user',
        content: `<topic>\n${topic}\n</topic>\n\n<passages>\n${found.map(formatPassage).join('\n\n')}\n</passages>`,
      },
    ],
  });

  const firstField = kind === 'short' ? 'title' : 'hook';
  let json = '';
  let shown = '';
  stream.on('text', (delta) => {
    json += delta;
    const text = partialString(json, firstField);
    if (text && text !== shown) {
      shown = text;
      onProgress?.({ type: 'opening', text });
    }
  });

  const message = await stream.finalMessage();
  if (message.stop_reason === 'refusal') {
    throw new Error(`The model declined to write this (${message.stop_details?.category ?? 'no category'}).`);
  }
  const text = message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
  let raw: unknown = null;
  try {
    raw = JSON.parse(text);
  } catch {}

  // Verify each quote against the passage it cites; fill verified quotes into the
  // [QUOTE n] placeholders and drop placeholders whose quote didn't check out.
  const offered = new Map(found.map((c) => [c.id, c]));
  const verify = (refs: z.infer<typeof PassageRef>[]) => {
    const byNumber = new Map<number, Passage>();
    const passages: Passage[] = [];
    let dropped = 0;
    refs.slice(0, 3).forEach((p, i) => {
      const chunk: Chunk | undefined = offered.get(p.chunk_id);
      if (chunk && quoteAppearsIn(p.quote, chunk.text)) {
        const passage = passageFromChunk(chunk, p.quote.trim(), p.why.trim());
        byNumber.set(i + 1, passage);
        passages.push(passage);
      } else {
        dropped++;
        console.warn(`Advisor script: dropped a quote that didn't match ${p.chunk_id}: ${p.quote.slice(0, 80)}`);
      }
    });
    const fill = (s: string) =>
      s
        .replace(/\[QUOTE (\d+)\]/gi, (_, n) => {
          const p = byNumber.get(Number(n));
          return p ? `“${p.quote}”` : '';
        })
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
    return { passages, dropped, fill };
  };

  let script: Script;
  let droppedQuotes: number;
  if (kind === 'short') {
    const parsed = ShortOut.safeParse(raw);
    if (!parsed.success) throw new Error(`The script couldn't be read (stop_reason: ${message.stop_reason}).`);
    const o = parsed.data;
    const { passages, dropped, fill } = verify(o.passages);
    droppedQuotes = dropped;
    script = {
      kind: 'short',
      title: o.title.trim(),
      hooks: o.hooks.map((h) => ({ text: fill(h.text), style: h.style.trim() })),
      beats: o.beats.map((b) => ({ voiceover: fill(b.voiceover), onScreen: fill(b.on_screen), visual: b.visual.trim() })),
      cta: fill(o.cta),
      caption: fill(o.caption),
      hashtags: o.hashtags.map((h) => h.replace(/^#/, '').trim()).filter(Boolean),
      passages,
    };
  } else {
    const parsed = LongOut.safeParse(raw);
    if (!parsed.success) throw new Error(`The script couldn't be read (stop_reason: ${message.stop_reason}).`);
    const o = parsed.data;
    const { passages, dropped, fill } = verify(o.passages);
    droppedQuotes = dropped;
    script = {
      kind: 'youtube',
      hook: fill(o.hook),
      sections: o.sections.map((s) => ({ heading: s.heading.trim(), voiceover: fill(s.voiceover), onScreen: fill(s.on_screen) })),
      outro: fill(o.outro),
      titles: o.titles.map((t) => t.trim()),
      thumbnailText: o.thumbnail_text.map((t) => t.trim()),
      description: fill(o.description),
      chapters: o.chapters,
      tags: o.tags.map((t) => t.trim()).filter(Boolean),
      passages,
    };
  }

  const entry = await addEntry(uid, { entry: topic, voice: voice.id, mode: kind, script });
  return { entry, droppedQuotes };
}
