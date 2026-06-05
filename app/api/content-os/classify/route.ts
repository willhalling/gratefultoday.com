import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import {
  CONTENT_OS_CATEGORIES,
  CONTENT_OS_TOPICS,
  type ContentOsCategory,
  type ContentOsTopic,
} from '@/types/content-os';

interface ClassifyRequest {
  beats?: string[];
}

function normalizeHeadlineWord(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z'.]/g, '')
    .split(/\s+/)[0] || '';
}

function normalizeTag(value: string): string {
  const tag = value.trim().toLowerCase().replace(/\s+/g, '');
  if (!tag) return '';
  return tag.startsWith('#') ? tag : `#${tag}`;
}

function fallbackHeadlineWord(beats: string[]): string {
  const stop = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'about', 'when',
    'what', 'where', 'why', 'how', 'then', 'than', 'have', 'just', 'like', 'your',
    'you', 'they', 'them', 'their', 'there', 'here', 'been', 'were', 'will', 'would',
    'could', 'should', 'after', 'before', 'over', 'under', 'still', 'now', 'today',
    'these', 'those', 'mostly', 'already', 'arrived', 'used', 'count',
  ]);
  const words = beats
    .join(' ')
    .toLowerCase()
    .match(/[a-z']+/g) || [];
  const candidate = words.find((w) => w.length >= 4 && !stop.has(w));
  return normalizeHeadlineWord(candidate || words[0] || 'quiet');
}

function isCategory(value: string): value is ContentOsCategory {
  return (CONTENT_OS_CATEGORIES as readonly string[]).includes(value);
}

function isTopic(value: string): value is ContentOsTopic {
  return (CONTENT_OS_TOPICS as readonly string[]).includes(value);
}

function fallbackClassification(beats: string[]): {
  category: ContentOsCategory;
  mainTopic: ContentOsTopic;
  secondaryTopic: ContentOsTopic;
  headlineWord: string;
  description: string;
  tags: string[];
} {
  const text = beats.join(' ').toLowerCase();
  const headlineWord = fallbackHeadlineWord(beats);
  const description = beats.join(' ').trim();
  const tags = ['#gratefultoday'];

  if (/mum|mom|dad|sister|brother|family|son|daughter|wife|husband|partner/.test(text)) {
    return { category: 'family', mainTopic: 'belonging', secondaryTopic: 'forgiveness', headlineWord, description, tags: [...tags, '#family', '#belonging'] };
  }
  if (/call|phone|text|message|ring/.test(text)) {
    return { category: 'calls', mainTopic: 'belonging', secondaryTopic: 'hope', headlineWord, description, tags: [...tags, '#calls', '#hope'] };
  }
  if (/meeting|chair|sponsor|step|sobriety/.test(text)) {
    return { category: 'meetings', mainTopic: 'sobriety', secondaryTopic: 'service', headlineWord, description, tags: [...tags, '#meetings', '#sobriety'] };
  }
  if (/time|morning|friday|years|late|early/.test(text)) {
    return { category: 'lost_years', mainTopic: 'time', secondaryTopic: 'regret', headlineWord, description, tags: [...tags, '#time', '#regret'] };
  }
  if (/death|die|grave|funeral|old|age|aging/.test(text)) {
    return { category: 'mortality', mainTopic: 'mortality', secondaryTopic: 'acceptance', headlineWord, description, tags: [...tags, '#mortality', '#acceptance'] };
  }
  if (/resent|angry|anger|blame/.test(text)) {
    return { category: 'resentment', mainTopic: 'forgiveness', secondaryTopic: 'acceptance', headlineWord, description, tags: [...tags, '#resentment', '#forgiveness'] };
  }

  return {
    category: 'ordinary_life',
    mainTopic: 'perspective',
    secondaryTopic: 'change',
    headlineWord,
    description,
    tags: [...tags, '#perspective', '#change'],
  };
}

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ClassifyRequest;
    const beats = (body.beats || []).map((b) => (b || '').trim()).filter(Boolean).slice(0, 4);

    if (beats.length < 2) {
      return NextResponse.json({ error: 'Provide at least 2 beats.' }, { status: 400 });
    }

    if (!anthropic) {
      return NextResponse.json(fallbackClassification(beats));
    }

    const system = [
      'You classify short reflective beats into taxonomy values.',
      `Allowed categories: ${CONTENT_OS_CATEGORIES.join(', ')}`,
      `Allowed topics: ${CONTENT_OS_TOPICS.join(', ')}`,
      'Also create a headline hook word.',
      'headlineWord rules: exactly one lowercase word, emotional/ambiguous, not literal, no hashtags.',
      'Also create a post description (1 short sentence) and 3-6 tags.',
      'Tag rules: lowercase, hashtag format.',
      'Return valid JSON only: {"category":"...","mainTopic":"...","secondaryTopic":"...","headlineWord":"...","description":"...","tags":["#...","#..."]}',
      'Do not include any explanation.',
    ].join('\n');

    const user = `Beats:\n${beats.map((b, i) => `${i + 1}. ${b}`).join('\n')}`;

    const result = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system,
      messages: [{ role: 'user', content: user }],
    });

    const text = result.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(fallbackClassification(beats));
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      category?: string;
      mainTopic?: string;
      secondaryTopic?: string;
      headlineWord?: string;
      description?: string;
      tags?: string[];
    };

    const fallback = fallbackClassification(beats);
    const category = isCategory(parsed.category || '') ? parsed.category : fallback.category;
    const mainTopic = isTopic(parsed.mainTopic || '') ? parsed.mainTopic : fallback.mainTopic;
    let secondaryTopic = isTopic(parsed.secondaryTopic || '') ? parsed.secondaryTopic : fallback.secondaryTopic;
    const headlineWord = normalizeHeadlineWord(parsed.headlineWord || '') || fallback.headlineWord;
    const description = (parsed.description || '').trim() || fallback.description;
    const tags = (parsed.tags || [])
      .map((tag) => normalizeTag(tag || ''))
      .filter(Boolean)
      .slice(0, 6);

    if (secondaryTopic === mainTopic) {
      secondaryTopic = mainTopic === 'time' ? 'change' : 'time';
    }

    return NextResponse.json({
      category,
      mainTopic,
      secondaryTopic,
      headlineWord,
      description,
      tags: tags.length > 0 ? tags : fallback.tags,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to classify beats.' }, { status: 500 });
  }
}
