export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const OPENAI_API_KEY = process.env.OPEN_AI_KEY;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type TranscribeMode = 'reflective' | 'raw';

interface WhisperSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

interface ChapterSegment {
  id: number;
  startSec: number;
  endSec: number;
  originalText: string;
}

export async function POST(req: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('audio');
    const prompt = formData.get('prompt');
    const modeField = formData.get('mode');
    const mode: TranscribeMode =
      modeField === 'raw' || modeField === 'reflective'
        ? (modeField as TranscribeMode)
        : 'reflective';

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    const blob = file as Blob;

    const openaiForm = new FormData();
    openaiForm.append('model', 'whisper-1');
    // Use the original Blob/File directly so the runtime can build a proper multipart form
    openaiForm.append('file', blob, (blob as any).name || 'audio.webm');
    openaiForm.append('response_format', 'verbose_json');
    if (prompt && typeof prompt === 'string' && prompt.trim().length > 0) {
      openaiForm.append('prompt', prompt.trim());
    }

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: openaiForm,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Whisper API error:', errorText);
      return NextResponse.json(
        { error: `Whisper API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    const transcript: string = data.text ?? '';
    const segments: WhisperSegment[] = Array.isArray(data.segments)
      ? data.segments.map((seg: any, index: number) => ({
          id: typeof seg.id === 'number' ? seg.id : index,
          start: typeof seg.start === 'number' ? seg.start : 0,
          end: typeof seg.end === 'number' ? seg.end : 0,
          text: typeof seg.text === 'string' ? seg.text.trim() : '',
        }))
      : [];

    if (mode === 'raw') {
      return NextResponse.json({ mode: 'raw', text: transcript, segments });
    }

    // Reflective mode: generate hopeful, powerful reflections for each CHAPTER
    if (!anthropic.apiKey) {
      console.warn('ANTHROPIC_API_KEY not configured, falling back to raw transcript');
      return NextResponse.json({ mode: 'raw', text: transcript, segments });
    }

    // First, merge short Whisper segments into longer "chapters"
    // so each reflective line can stay on screen for at least ~12 seconds.
    const MIN_DURATION_SEC = 12;
    const usableSegments = segments.filter((s) => s.text && s.end > s.start);

    const chapters: ChapterSegment[] = [];
    let buffer: WhisperSegment[] = [];

    const flushChapter = () => {
      if (!buffer.length) return;
      const startSec = buffer[0].start;
      const endSec = buffer[buffer.length - 1].end;
      const originalText = buffer.map((b) => b.text).join(' ');
      chapters.push({
        id: buffer[0].id,
        startSec,
        endSec,
        originalText,
      });
      buffer = [];
    };

    for (const seg of usableSegments) {
      if (!buffer.length) {
        buffer.push(seg);
        continue;
      }

      buffer.push(seg);
      const currentDuration = buffer[buffer.length - 1].end - buffer[0].start;
      if (currentDuration >= MIN_DURATION_SEC) {
        flushChapter();
      }
    }

    // Flush any remaining short tail as its own (possibly shorter) chapter
    flushChapter();

    // If for some reason we ended up with no chapters (e.g. empty text),
    // just fall back to raw behaviour.
    if (!chapters.length) {
      return NextResponse.json({ mode: 'raw', text: transcript, segments });
    }

    const chapterPayload = chapters.map((c) => ({
      id: c.id,
      start: c.startSec,
      end: c.endSec,
      text: c.originalText,
    }));

    const reflectionPrompt = `You are helping create on-screen text overlays for slow, meditative recovery and gratitude videos.

The input is a list of chapter segments from an audio track. Each chapter has:
- id: numeric id
- start: start time in seconds
- end: end time in seconds
- text: the raw transcription of what was spoken

For EACH chapter, write ONE VERY SHORT, reflective, powerful and hopeful phrase that could appear on screen for the duration of that chapter. Guidelines:
- Tone: gentle, compassionate, recovery-focused, hopeful
- Style: simple, human, like a supportive friend
- Length: 1–5 words ONLY (no full sentences)
- No timestamps, no quotes from the original text, no markup
- Acknowledge struggle but always move toward hope, self-compassion and resilience

Return ONLY valid JSON in this exact format (no extra text):
[
  { "id": number, "reflection": "string" }
]

Here are the segments as JSON:
${JSON.stringify(chapterPayload, null, 2)}
`;

    const message = await anthropic.messages.create({
      // Reuse the same model as the YouTube generator to avoid model-not-found errors
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: reflectionPrompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected reflection response type');
    }

    const text = content.text.trim();
    const jsonMatch = text.match(/\[.*\]/s);
    if (!jsonMatch) {
      throw new Error('No JSON array found in reflection response');
    }

    let reflectionsRaw: { id: number; reflection: string }[] = [];
    try {
      reflectionsRaw = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('Failed to parse reflections JSON:', e);
      throw new Error('Failed to parse reflections JSON');
    }

    const reflectionMap = new Map<number, string>();
    for (const item of reflectionsRaw) {
      if (typeof item?.id === 'number' && typeof item?.reflection === 'string') {
        // Enforce ultra-short "chapter title" style: 1–5 words max.
        const cleaned = item.reflection.replace(/[.!?…]+$/g, '').trim();
        const words = cleaned.split(/\s+/).filter(Boolean);
        const limited = words.slice(0, 5).join(' ');
        reflectionMap.set(item.id, limited);
      }
    }

    const overlays = chapters.map((c) => ({
      id: c.id,
      startSec: c.startSec,
      endSec: c.endSec,
      originalText: c.originalText,
      reflectionText: reflectionMap.get(c.id) || c.originalText,
    }));

    return NextResponse.json({ mode: 'reflective', transcript, overlays });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}
