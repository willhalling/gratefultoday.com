import { NextRequest, NextResponse } from 'next/server';
import { rejectNonAdmin } from '@/lib/tiktok-maker/admin-auth';
import { saveVoiceover } from '@/lib/tiktok-maker/library-server';

/** Grateful Today narrator. */
const VOICE_ID = '9ZqbCbmQ3T12xvHaOrur';
/** v3 is the model that performs [bracketed] audio tags. */
const MODEL_ID = 'eleven_v3';

export async function POST(req: NextRequest) {
  const rejected = await rejectNonAdmin(req);
  if (rejected) return rejected;

  const { text, stability, scriptId } = (await req.json().catch(() => ({}))) as {
    text?: string;
    stability?: number;
    scriptId?: string;
  };
  if (!text?.trim()) return NextResponse.json({ error: 'Text is required.' }, { status: 400 });
  if (text.length > 3000) return NextResponse.json({ error: 'Script is too long (3000 characters max).' }, { status: 400 });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'ElevenLabs API key not configured.' }, { status: 500 });

  // v3 stability is one of 0 (creative), 0.5 (natural), 1 (robust).
  const s = stability === 0 || stability === 1 ? stability : 0.5;
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { Accept: 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': apiKey },
      body: JSON.stringify({ text: text.trim(), model_id: MODEL_ID, voice_settings: { stability: s } }),
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    console.error('[tiktok-maker/voiceover] ElevenLabs error:', response.status, detail);
    let message = `ElevenLabs error ${response.status}`;
    try {
      const parsed = JSON.parse(detail) as { detail?: { message?: string } | string };
      const msg = typeof parsed.detail === 'string' ? parsed.detail : parsed.detail?.message;
      if (msg) message += `: ${msg}`;
    } catch {
      // Non-JSON error body.
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
  const mp3 = Buffer.from(await response.arrayBuffer());
  // Every take is kept (Storage + Firestore) before the audio is returned.
  try {
    const record = await saveVoiceover(mp3, {
      scriptId: typeof scriptId === 'string' && scriptId ? scriptId : null,
      text: text.trim(),
      voiceId: VOICE_ID,
      model: MODEL_ID,
      stability: s,
    });
    return new NextResponse(new Uint8Array(mp3), {
      headers: { 'Content-Type': 'audio/mpeg', 'X-Voiceover-Id': record.id },
    });
  } catch (error) {
    console.error('[tiktok-maker/voiceover] save failed:', error);
    return new NextResponse(new Uint8Array(mp3), {
      headers: { 'Content-Type': 'audio/mpeg', 'X-Save-Error': 'Voiceover could not be saved to the library.' },
    });
  }
}
