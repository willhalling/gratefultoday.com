import { NextRequest, NextResponse } from 'next/server';
import { rejectNonAdmin } from '@/lib/tiktok-maker/admin-auth';
import { readVoiceover } from '@/lib/tiktok-maker/library-server';

/** The saved MP3 for one voiceover take (Storage stays private; this streams it to admins). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rejected = await rejectNonAdmin(req);
  if (rejected) return rejected;
  const { id } = await params;
  try {
    const mp3 = await readVoiceover(id);
    return new NextResponse(new Uint8Array(mp3), {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=31536000, immutable' },
    });
  } catch (error) {
    console.error('[tiktok-maker/library] voiceover read failed:', error);
    return NextResponse.json({ error: 'Voiceover not found.' }, { status: 404 });
  }
}
