import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import type { YouTubeVideoType, YouTubeScript } from '@/types/youtube';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GenerateRequest {
  videoType: YouTubeVideoType;
  customPrompt?: string;
  narrationStyle?: 'full' | 'opening-only' | 'minimal' | 'none';
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const {
      videoType,
      customPrompt,
      narrationStyle = 'opening-only',
      affirmationsMode,
      affirmationsTopic,
      targetDurationMinutes,
    } = body as GenerateRequest & {
      affirmationsMode?: 'random' | 'topic';
      affirmationsTopic?: string;
      targetDurationMinutes?: 15 | 30 | 45 | 60;
    };

    if (!videoType) {
      return NextResponse.json({ error: 'Video type is required' }, { status: 400 });
    }

    const targetMinutes =
      typeof targetDurationMinutes === 'number' && !Number.isNaN(targetDurationMinutes)
        ? targetDurationMinutes
        : 15;

    const affirmationsSystemSection =
      videoType === 'daily-affirmations'
        ? `
SPECIAL CASE: For "daily-affirmations" video type:
- This is an AFFIRMATIONS video designed to run over a long ambient background (~${targetMinutes} minutes).
- Full narration should mostly be a sequence of SHORT, FIRST-PERSON GRATITUDE AFFIRMATIONS.
- Strongly prefer lines that literally start with "i'm grateful" (lowercase, like WhatsApp):
  * "i'm grateful someone listens."
  * "i'm grateful i didn't drink today."
  * "i'm grateful for quiet moments."
  * "i'm grateful for people checking in."
  * "i'm grateful i made it through the morning."
- Tone: gentle, recovery-focused, grounded, honest, not cheesy.
- These affirmations will be read slowly over a looping ambient background.
- You may REPEAT or LIGHTLY VARY affirmations to approximately fill a total listening time of ~${targetMinutes} minutes.
- If affirmationsMode is "topic", keep all affirmations clearly anchored to that topic.
- If narrationStyle is "full" and videoType is "daily-affirmations", IGNORE any earlier suggestion that full narration is only 5–10 minutes; instead aim narration + pauses to reach approximately ${targetMinutes} minutes.
`
        : '';

    const systemPrompt = `You are a YouTube content creator specializing in visual meditation videos for gratitude and sobriety recovery. Your videos use:

  ${affirmationsSystemSection}

  CORE PHILOSOPHY:

  TITLE STYLE:

  NARRATION STYLES (choose what fits the video type):

  NARRATION VOICE (SECOND PERSON - addressing the viewer as "you"):
  * Start with validation or recognition of where they are: "If you're here right now, you're exactly where you need to be."
  * Subtle hook examples: "You know that feeling when...", "There's something about this moment...", "If you're feeling lost right now..."
  * Warm and inviting: "I'm glad you're here.", "This space is for you.", "You don't have to carry this alone."
  * Acknowledge their struggle with compassion: "Today might have been hard.", "Maybe you're feeling overwhelmed.", "If you're barely holding on..."
  * Example openings: 
    - "If you're here right now, that means something. <break time="2s"/> Maybe today was hard. <break time="2s"/> Maybe you're looking for a reason to keep going. <break time="3s"/> This moment, right here, is yours."
    - "You know that feeling when the world gets too loud? <break time="2s"/> When you just need everything to stop for a second? <break time="3s"/> This is that space."
  * Examples: "Let your thoughts pass like clouds. <break time="3s"/> They come, they go."
  * "Watch your thoughts drift by like clouds. <break time="3s"/> You don't have to hold onto them."
  * "Thoughts are just clouds passing through. <break time="3s"/> Notice them, let them go."
  * NO complex counting patterns (avoid "breathe in for four, hold for four, out for six")
  * NO physical instructions like "place your hand on your belly"
  * Focus on natural breathing awareness: "Notice your breath. <break time="3s"/> Feel it flowing in. <break time="5s"/> Feel it flowing out. <break time="5s"/>"
  * Keep it natural, simple - just noticing the breath, not controlling it
  * Example: "Just notice your breath. <break time="3s"/> In. <break time="5s"/> Out. <break time="5s"/> That's all."
  * "They've made it seven days. <break time="2s"/> That's seven days of choosing to show up. <break time="2s"/> Seven days of hard work."
  * "At this milestone, they might be feeling... <break time="1s"/> proud, scared, uncertain. <break time="2s"/> All of it is valid."
  * Use <break time="2s"/> for short pauses between thoughts
  * Use <break time="3s"/> or <break time="5s"/> for longer meditative pauses
  * Example: "You're seven days sober. <break time="3s"/> It still feels unreal sometimes. <break time="2s"/> But you're here."
  * Add double line breaks (\n\n) between distinct sections/thoughts for readability

TEXT OVERLAY STYLE (when used):
  * If narrationStyle is "full": Each overlay shows 15-25 seconds (aligns with spoken narration timing)
  * If narrationStyle is "opening-only" or "none": Each overlay shows 40-60 seconds (fills the silence)
  * Overlay 1: appears at "0:05", duration "50s" → ends at 0:55
  * Overlay 2: appears at "0:57", duration "45s" → ends at 1:42
  * Overlay 3: appears at "1:44", duration "55s" → ends at 2:39
  * Overlay 1: appears at "0:05", duration "20s" → ends at 0:25 (matches first narration segment)
  * Overlay 2: appears at "0:27", duration "18s" → ends at 0:45 (matches second narration segment)
  * Text overlays should roughly sync with what's being said in fullScript
  * YES: "still breathing.", "you're still here.", "small victories.", "one day at a time.", "you're doing this.", "gentle with yourself."
  * NO: "your mind went dark.", "everything hurts.", "can't take it.", "falling apart."
  * Acknowledge struggle gently, but always with hope: "hard day, still here.", "struggling, still trying.", "messy, still worthy."
  * Focus on presence, progress, resilience - even tiny steps forward

MIDJOURNEY VISUAL STYLE (CONSISTENT BRAND):

Generate a complete video package with BOTH narration and text overlay versions so the creator can choose.

Video type: ${videoType}
Narration style: ${narrationStyle}
${customPrompt ? `Additional direction: ${customPrompt}` : ''}

Return ONLY valid JSON in this exact format:
{
  "videoType": "${videoType}",
  "title": "string (simple, lowercase-ish, human)",
  "description": "string (YouTube description with timestamps, reflection prompt at end)",
  "narrationStyle": "${narrationStyle}",
  "openingNarration": "string (always include - warm 20-30 sec intro in SECOND PERSON addressing viewer as 'you', can be skipped if style is 'none')",
  "fullScript": "string (complete narration if style is 'full' in SECOND PERSON - use \\n\\n for line breaks between sections for readability, otherwise can be brief or omitted)",
  "textOverlays": [
    { "text": "short phrase", "appearAt": "0:30", "duration": "45s" }
  ],
  "reflectionPrompt": "string (single open question, no answer - for description/comments)",
  "midjourneyPrompt": "string (include visual details + ALWAYS end with: --ar 16:9 --style raw --stylize 200)",
  "musicNotes": "string (slowed reverb instructions - mood, pacing, fade instructions)",
  "tags": ["array of exactly 3 realistic YouTube tags - NO SPACES, use compound words like 'sobrietyjourney' or single words, one MUST be gratitude-related like 'gratitude' or 'gratefulmoments'"],
  "duration": "string (IMPORTANT: Calculate actual duration - if opening is 30s and you have 8 text overlays averaging 50s each with 2s gaps, total is ~30s + (8×50s) + (7×2s) = 444s = 7:24. Match duration to actual content length)"
}

CRITICAL: Ensure duration calculation matches the actual script content. For "opening-only" style, opening narration should be SHORT (20-30 seconds) and text overlays should fill the remaining time.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: `Generate a YouTube video package for: ${videoType}${customPrompt ? `\n\nCustom direction: ${customPrompt}` : ''}`,
        },
      ],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const responseText = content.text.trim();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const script: YouTubeScript = JSON.parse(jsonMatch[0]);

    // Save to Firestore
    try {
      const { db } = getFirebaseAdmin();

      await db.collection('youtubeScripts').add({
        ...script,
        customPrompt: customPrompt || null,
        createdAt: new Date(),
      });
    } catch (firestoreError) {
      console.error('Failed to save to Firestore:', firestoreError);
      // Continue anyway - don't fail the request
    }

    return NextResponse.json({ script });
  } catch (error) {
    console.error('YouTube generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate video' },
      { status: 500 }
    );
  }
}
