import Anthropic from '@anthropic-ai/sdk';
import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import {
  CONTENT_OS_CATEGORIES,
  CONTENT_OS_TOPICS,
  type ContentOsCategory,
  type ContentOsTopic,
} from '@/types/content-os';

interface GenerateRequest {
  category: ContentOsCategory;
  mainTopic: ContentOsTopic;
  secondaryTopic: ContentOsTopic;
  count: number;
  extraInstruction?: string;
  mixAcrossTaxonomy?: boolean;
}

interface GeneratedEntry {
  lane: ContentOsCategory;
  theme: ContentOsTopic;
  beats: string[];
  tags: string[];
  headlineWord: string;
}

interface GeneratedPost {
  name: string;
  category: ContentOsCategory;
  mainTopic: ContentOsTopic;
  secondaryTopic: ContentOsTopic;
  beats: string[];
  description: string;
  tags: string[];
  headlineWord: string;
}

interface DiversityPlanItem {
  lane: ContentOsCategory;
  theme: ContentOsTopic;
  secondaryTopic: ContentOsTopic;
}

interface QualityResult {
  ok: boolean;
  reason?: string;
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const PROMPT_ROOT = path.join(process.cwd(), 'prompts');
const MAX_GENERATION_ATTEMPTS = 4;
const MAX_BEAT_WORDS = 10;
const MAX_BEAT_CHARS = 65;
const MAX_COMMAS_PER_BEAT = 1;

const HARD_REJECT_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /six months to live/i, reason: 'terminal illness reveal' },
  { pattern: /then she found out/i, reason: 'third-person reveal pattern' },
  { pattern: /then he found out/i, reason: 'third-person reveal pattern' },
  { pattern: /everything changed/i, reason: 'dramatic pivot phrase' },
  { pattern: /life taught me/i, reason: 'moral lesson phrase' },
  { pattern: /healing/i, reason: 'therapy-style language' },
  { pattern: /closure/i, reason: 'closure language' },
  { pattern: /journey/i, reason: 'journey language' },
  { pattern: /growth/i, reason: 'growth language' },
  { pattern: /terminal illness/i, reason: 'terminal illness language' },
  { pattern: /secret reveal/i, reason: 'secret reveal language' },
];

const QUALITY_REJECT_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /now i (realise|realize)/i, reason: 'explicit realization phrase' },
  { pattern: /in the end/i, reason: 'complete-story ending' },
  { pattern: /finally/i, reason: 'closure ending' },
  { pattern: /so i learned/i, reason: 'moral lesson ending' },
  { pattern: /that's why/i, reason: 'moral explanation ending' },
  { pattern: /turns out/i, reason: 'plot-twist framing' },
  { pattern: /(soap opera|dramatic reveal|plot twist)/i, reason: 'dramatic fiction style' },
  // Hook-quality: first beat must not be a flat "X used to / always / spent years" opener
  { pattern: /^(my (dad|mum|mom|mother|father|sister|brother|gran|grandma|grandad|grandpa|friend|wife|husband|partner) (used to|always|would always|never))/i, reason: 'flat statement opener — needs a question or jolt' },
  { pattern: /^i spent years/i, reason: 'flat narrative opener — needs a question or jolt' },
  { pattern: /^i (used to|always|would always|never)/i, reason: 'flat statement opener — needs a question or jolt' },
];

// Patterns rejected when they appear at the start of the FINAL beat —
// these turn the payoff into a status update rather than a realization.
const FINAL_BEAT_UPDATE_TRAP_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /^now i\b/i, reason: 'final beat is an "update" — needs a realization, not a status' },
  { pattern: /^these days i\b/i, reason: 'final beat is an "update" — needs a realization, not a status' },
  { pattern: /^today i\b/i, reason: 'final beat is an "update" — needs a realization, not a status' },
  { pattern: /^currently i\b/i, reason: 'final beat is an "update" — needs a realization, not a status' },
  { pattern: /^nowadays i\b/i, reason: 'final beat is an "update" — needs a realization, not a status' },
  { pattern: /^so now\b/i, reason: 'final beat is an "update" — needs a realization, not a status' },
  { pattern: /^so these days\b/i, reason: 'final beat is an "update" — needs a realization, not a status' },
];

async function readPromptFile(relativePath: string): Promise<string> {
  const absolutePath = path.join(PROMPT_ROOT, relativePath);
  try {
    const content = await fs.readFile(absolutePath, 'utf-8');
    return content.trim();
  } catch {
    throw new Error(`Missing prompt file: prompts/${relativePath}`);
  }
}

async function buildSystemPrompt(plan: DiversityPlanItem[]): Promise<string> {
  const baseStyle = await readPromptFile('base-style.md');
  const negativeRules = await readPromptFile('negative-rules.md');

  const lanes = Array.from(new Set(plan.map((item) => item.lane)));
  const lanePrompts = await Promise.all(
    lanes.map(async (lane) => {
      const lanePrompt = await readPromptFile(`lanes/${lane}.md`);
      return `Lane guidance (${lane}):\n${lanePrompt}`;
    })
  );

  const outputContract = `Output contract:\n- Return ONLY valid JSON\n- Top-level key: "entries"\n- entries must be an array of objects\n- each object: { lane, theme, beats, tags, headlineWord }\n- beats should usually be 3 lines, sometimes 2 or 4\n- tags should be lowercase hashtags\n- headlineWord: a short phrase (1–5 words, all lowercase) that acts as "beat 0" — the first thing the viewer sees before the beats begin. It must create curiosity, recognition, or emotional tension that makes the viewer want to read beat 1. It should feel like a half-formed thought or quiet moment of realisation, not a category label or topic noun. Good examples: "i blinked", "still meaning to", "when did that happen?", "i wasn't ready", "not yet", "soon", "eventually", "wait a minute", "i didn't notice", "that's the strange part". Bad examples: "mortality", "identity", "friendship", "gratitude", "wasting", "regret", "philosophy". The headline must connect directly to beat 1 and give the viewer a reason to continue reading.`;

  return [baseStyle, ...lanePrompts, negativeRules, outputContract].join('\n\n---\n\n');
}

function isCategory(value: string): value is ContentOsCategory {
  return (CONTENT_OS_CATEGORIES as readonly string[]).includes(value);
}

function isTopic(value: string): value is ContentOsTopic {
  return (CONTENT_OS_TOPICS as readonly string[]).includes(value);
}

function normalizeCount(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(20, Math.floor(value)));
}

function normalizeTag(value: string): string {
  const tag = value.trim().toLowerCase().replace(/\s+/g, '');
  if (!tag) return '';
  return tag.startsWith('#') ? tag : `#${tag}`;
}

function normalizeBeats(beats: string[]): string[] {
  const cleaned = beats
    .map((beat) => beat.trim().toLowerCase())
    .filter(Boolean);

  if (cleaned.length > 4) return cleaned.slice(0, 4);
  if (cleaned.length >= 2) return cleaned;
  return [];
}

function slugifyName(value: string, fallback: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || fallback;
}

function shuffledCopy<T>(values: readonly T[]): T[] {
  const next = [...values];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = next[i];
    next[i] = next[j];
    next[j] = temp;
  }
  return next;
}

function pickSecondaryTopic(
  primary: ContentOsTopic,
  fallback: ContentOsTopic,
  offset: number
): ContentOsTopic {
  if (fallback !== primary) return fallback;

  const pool = CONTENT_OS_TOPICS;
  const baseIndex = pool.findIndex((topic) => topic === primary);
  if (baseIndex < 0) return fallback;

  for (let step = 1; step <= pool.length; step += 1) {
    const index = (baseIndex + step + offset) % pool.length;
    const candidate = pool[index];
    if (candidate !== primary) {
      return candidate;
    }
  }

  return fallback;
}

function buildDiversityPlan(count: number, fallbackSecondary: ContentOsTopic): DiversityPlanItem[] {
  const lanes = shuffledCopy(CONTENT_OS_CATEGORIES);
  const themes = shuffledCopy(CONTENT_OS_TOPICS);

  return Array.from({ length: count }, (_, index) => {
    const lane = lanes[index % lanes.length];
    const theme = themes[index % themes.length];
    const secondaryTopic = pickSecondaryTopic(theme, fallbackSecondary, index);

    return {
      lane,
      theme,
      secondaryTopic,
    };
  });
}

function hasFirstPerson(text: string): boolean {
  return /\b(i|i'm|im|i've|ive|i'd|id|me|my|myself)\b/i.test(text);
}

function evaluateQuality(entry: GeneratedEntry): QualityResult {
  const joined = entry.beats.join(' ');

  for (const beat of entry.beats) {
    const words = beat.trim().split(/\s+/).filter(Boolean);
    if (words.length > MAX_BEAT_WORDS) {
      return {
        ok: false,
        reason: `beat too long (${words.length} words, max ${MAX_BEAT_WORDS})`,
      };
    }
    if (beat.length > MAX_BEAT_CHARS) {
      return {
        ok: false,
        reason: `beat too long (${beat.length} chars, max ${MAX_BEAT_CHARS})`,
      };
    }
    const commaCount = (beat.match(/,/g) || []).length;
    if (commaCount > MAX_COMMAS_PER_BEAT) {
      return { ok: false, reason: 'beat has too many clauses' };
    }
    if (/\b(and|but|because|so that|which|while)\b.*\b(and|but|because|so that|which|while)\b/i.test(beat)) {
      return { ok: false, reason: 'beat reads like a run-on sentence' };
    }
    if (/\b(asked|said|told|replied|answered)\b.*\b(asked|said|told|replied|answered)\b/i.test(beat)) {
      return { ok: false, reason: 'beat reads like dialogue narration' };
    }
  }

  for (const rule of HARD_REJECT_PATTERNS) {
    if (rule.pattern.test(joined)) {
      return { ok: false, reason: rule.reason };
    }
  }

  // Quality patterns that apply to all beats combined.
  const fullTextRules = QUALITY_REJECT_PATTERNS.filter(
    (r) => !r.reason.includes('opener'),
  );
  for (const rule of fullTextRules) {
    if (rule.pattern.test(joined)) {
      return { ok: false, reason: rule.reason };
    }
  }

  // Hook-quality patterns only apply to the first beat.
  const firstBeat = (entry.beats[0] ?? '').trim();
  const hookRules = QUALITY_REJECT_PATTERNS.filter((r) =>
    r.reason.includes('opener'),
  );
  for (const rule of hookRules) {
    if (rule.pattern.test(firstBeat)) {
      return { ok: false, reason: rule.reason };
    }
  }

  // Final-beat "update trap": the last beat must be a realization, not a status update.
  if (entry.beats.length >= 3) {
    const finalBeat = (entry.beats[entry.beats.length - 1] ?? '').trim();
    for (const rule of FINAL_BEAT_UPDATE_TRAP_PATTERNS) {
      if (rule.pattern.test(finalBeat)) {
        return { ok: false, reason: rule.reason };
      }
    }
  }

  if (!hasFirstPerson(joined)) {
    return { ok: false, reason: 'missing first-person voice' };
  }

  if (/\b(he|she|they|his|her|their)\b/i.test(joined) && !hasFirstPerson(joined)) {
    return { ok: false, reason: 'third-person narrative dominance' };
  }

  if (/\b(then|after that|suddenly)\b.*\b(found out|revealed|diagnosed|secret)\b/i.test(joined)) {
    return { ok: false, reason: 'dramatic reveal structure' };
  }

  if (/\b(therefore|so now|from then on|ever since)\b/i.test(joined)) {
    return { ok: false, reason: 'resolved moral arc' };
  }

  // Reject headline if it is a bare category/topic label with no narrative tension.
  if (entry.headlineWord && !entry.headlineWord.includes(' ')) {
    const labelWord = entry.headlineWord.toLowerCase().replace(/[^a-z]/g, '');
    const categoryFlat = (CONTENT_OS_CATEGORIES as readonly string[]).map((c) => c.replace(/_/g, ''));
    const topicList = (CONTENT_OS_TOPICS as readonly string[]);
    if (categoryFlat.includes(labelWord) || topicList.includes(labelWord as ContentOsTopic)) {
      return { ok: false, reason: 'headline is a category/topic label — needs a narrative hook phrase' };
    }
  }

  return { ok: true };
}

async function callAnthropic(systemPrompt: string, userPrompt: string) {
  const result = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const chunks: string[] = [];
  for (const block of result.content) {
    if (block.type === 'text') {
      chunks.push(block.text);
    }
  }

  const text = chunks.join('\n').trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI response did not include JSON');
  }

  return JSON.parse(jsonMatch[0]) as {
    entries?: Array<{
      lane?: string;
      theme?: string;
      beats?: string[];
      tags?: string[];
      headlineWord?: string;
    }>;
    posts?: Array<{
      category?: string;
      mainTopic?: string;
      beats?: string[];
      tags?: string[];
      headlineWord?: string;
    }>;
  };
}

function normalizeCandidate(
  raw: { lane?: string; theme?: string; beats?: string[]; tags?: string[]; headlineWord?: string },
  planned: DiversityPlanItem,
  fallback: { lane: ContentOsCategory; theme: ContentOsTopic }
): GeneratedEntry | null {
  const rawLane = raw.lane || '';
  const rawTheme = raw.theme || '';
  const lane: ContentOsCategory = isCategory(rawLane) ? rawLane : planned.lane || fallback.lane;
  const theme: ContentOsTopic = isTopic(rawTheme) ? rawTheme : planned.theme || fallback.theme;
  const beats = normalizeBeats(raw.beats || []);
  if (beats.length < 2) return null;

  const tags = (raw.tags || [])
    .map((tag) => normalizeTag(tag))
    .filter(Boolean)
    .slice(0, 7);

  const laneTag = `#${lane.replace(/_/g, '')}`;
  if (!tags.includes(laneTag)) {
    tags.unshift(laneTag);
  }

  // Validate/normalise headlineWord: 1–5 word beat-0 phrase.
  const rawHeadline = (raw.headlineWord || '').trim().toLowerCase()
    .replace(/[^a-z' .!?,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const headlineWord = rawHeadline.split(' ').filter(Boolean).slice(0, 5).join(' ');

  const entry: GeneratedEntry = {
    lane,
    theme,
    beats,
    tags: tags.slice(0, 7),
    headlineWord,
  };

  const quality = evaluateQuality(entry);
  if (!quality.ok) {
    return null;
  }

  return entry;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<GenerateRequest>;

    if (!body.category || !isCategory(body.category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }
    if (!body.mainTopic || !isTopic(body.mainTopic)) {
      return NextResponse.json({ error: 'Invalid main topic' }, { status: 400 });
    }
    if (!body.secondaryTopic || !isTopic(body.secondaryTopic)) {
      return NextResponse.json({ error: 'Invalid secondary topic' }, { status: 400 });
    }

    const baseCategory: ContentOsCategory = body.category;
    const baseMainTopic: ContentOsTopic = body.mainTopic;
    const baseSecondaryTopic: ContentOsTopic = body.secondaryTopic;

    const count = normalizeCount(body.count || 1);
    const useMixedTaxonomy = Boolean(body.mixAcrossTaxonomy) && count > 1;
    const diversityPlan = useMixedTaxonomy ? buildDiversityPlan(count, baseSecondaryTopic) : [];

    const acceptedEntries: GeneratedEntry[] = [];

    for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
      if (acceptedEntries.length >= count) break;

      const remaining = count - acceptedEntries.length;
      const activePlan = useMixedTaxonomy
        ? diversityPlan.slice(acceptedEntries.length, acceptedEntries.length + remaining)
        : Array.from({ length: remaining }, (_, index) => ({
            lane: body.category as ContentOsCategory,
            theme: baseMainTopic,
            secondaryTopic: pickSecondaryTopic(
              baseMainTopic,
              baseSecondaryTopic,
              index
            ),
          }));

      const systemPrompt = await buildSystemPrompt(activePlan);

      const diversityPrompt = useMixedTaxonomy
        ? `\n\nUse this diversity plan and keep one distinct entry per row:\n${JSON.stringify(
            activePlan,
            null,
            2
          )}\n\nRules for diversity mode:\n- use each row's lane as the entry lane\n- use each row's theme as the entry theme\n- produce exactly ${remaining} entries matching this plan in order\n- avoid repeating near-identical scenarios across entries`
        : '';

      const directionBlock = body.extraInstruction?.trim()
        ? `CREATIVE DIRECTION (this is the primary brief — overrides lane and theme taxonomy below):
${body.extraInstruction.trim()}

All entries MUST be directly about this direction. Do not default to the lane/theme taxonomy.
Generate concrete, specific moments that live inside this exact subject matter.
Example: if the direction is "mornings, not wasting life" write about early alarms, the quiet before 6am, getting up when the house is still dark — not generic observations about time or gratitude.`
        : '';

      const userPrompt = `Generate ${remaining} entries.

${directionBlock ? directionBlock + '\n\n' : ''}lane: ${body.category}
theme: ${body.mainTopic}
secondary context: ${body.secondaryTopic}
${diversityPrompt}

Voice requirements:
- first person by default
- lowercase only
- observations over stories
- unresolved thoughts preferred
- leave emotional space for the reader

Structure requirements:
- 3 beats preferred
- 2 beats acceptable
- 4 beats occasional

Beat length (HARD rules — violating these means the output is rejected):
- each beat must be 4 to 9 words, absolute maximum 10 words
- each beat must be under ${MAX_BEAT_CHARS} characters
- maximum ${MAX_COMMAS_PER_BEAT} comma per beat
- never join two ideas with "and", "but", "which", "because", "while"
- one image, one moment, or one quiet thought per beat
- never narrate a scene or summarize a conversation in a single beat

Good beat examples (do this):
- "i kept saying we'd meet up soon."
- "eventually we stopped saying it."
- "then we stopped talking."
- "the older i get."
- "the more i understand him."

Bad beat examples (NEVER do this — too long, too narrative):
- "my sister called asking how i'm doing and i said fine, which wasn't a lie exactly"
- "she said she's been worried about me since dad's thing and i almost told her about the sleepless nights"
- "instead i asked about her garden and we talked about tomatoes for twenty minutes"

Reject these patterns internally before finalizing output:
- six months to live
- then she found out / then he found out
- everything changed
- life taught me
- healing
- closure
- journey
- growth

Beat 3 quality (most common failure point — apply this check before returning):
- the final beat must be a realization, not a status update
- do NOT start the final beat with "now i...", "these days i...", "today i...", "currently i...", "nowadays i...", "so now...", "so these days..." — these turn the payoff into an update and will be rejected
- the final beat must make the reader reinterpret beats 1 and 2
- if the post would still work with the final beat removed, rewrite the final beat
- good final beat examples: "i thought there'd always be another one.", "i'd love one of them back.", "maybe i'm paying attention.", "they're probably wondering the same thing."
- bad final beat examples (update trap — never produce these): "now i set three alarms.", "these days i wake up early.", "today i value time differently."

Return strictly valid json only.`;

      const parsed = await callAnthropic(systemPrompt, userPrompt);

      const fromEntries = (parsed.entries || []).map((item) => ({
        lane: item.lane,
        theme: item.theme,
        beats: item.beats,
        tags: item.tags,
        headlineWord: item.headlineWord,
      }));

      const fromLegacyPosts = (parsed.posts || []).map((item) => ({
        lane: item.category,
        theme: item.mainTopic,
        beats: item.beats,
        tags: item.tags,
        headlineWord: item.headlineWord,
      }));

      const candidates = fromEntries.length > 0 ? fromEntries : fromLegacyPosts;

      for (let i = 0; i < activePlan.length; i += 1) {
        if (acceptedEntries.length >= count) break;

        const candidate = candidates[i];
        if (!candidate) continue;

        const normalized = normalizeCandidate(candidate, activePlan[i], {
          lane: baseCategory,
          theme: baseMainTopic,
        });
        if (!normalized) continue;

        acceptedEntries.push(normalized);
      }
    }

    if (acceptedEntries.length === 0) {
      throw new Error('Quality gate rejected all entries. Try again with a different instruction.');
    }

    const posts: GeneratedPost[] = acceptedEntries.map((entry, index) => {
      const fallbackName = `generated-${Date.now()}-${index + 1}`;
      const firstBeat = entry.beats[0] || fallbackName;
      const planned = useMixedTaxonomy ? diversityPlan[index] : undefined;
      const secondaryTopic = planned
        ? planned.secondaryTopic
        : pickSecondaryTopic(entry.theme, baseSecondaryTopic, index);

      return {
        name: slugifyName(firstBeat.slice(0, 40), fallbackName),
        category: entry.lane,
        mainTopic: entry.theme,
        secondaryTopic,
        beats: entry.beats,
        description: entry.beats[2] || entry.beats[1] || '',
        tags: entry.tags,
        headlineWord: entry.headlineWord,
      };
    });

    return NextResponse.json({
      posts,
      entries: acceptedEntries,
      meta: {
        requestedCount: count,
        returnedCount: acceptedEntries.length,
        attempts: MAX_GENERATION_ATTEMPTS,
      },
    });
  } catch (error) {
    console.error('Content OS generation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate posts' },
      { status: 500 }
    );
  }
}
