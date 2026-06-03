import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId, modelId, stability, similarityBoost, style } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
    }

    // Default voice settings (optimized for slow meditative videos)
    const voiceSettings = {
      stability: stability ?? 0.65,
      similarity_boost: similarityBoost ?? 0.75,
      style: style ?? 0.1,
      use_speaker_boost: true,
    };

    // Use text-to-speech endpoint with SSML support
    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId || '3Q0HiHNecynsdqicntLT'}`;

    const response = await fetch(elevenLabsUrl, {
      method: 'POST',
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: modelId || 'eleven_multilingual_v2',
        voice_settings: voiceSettings,
        apply_text_normalization: 'auto',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    // Get the audio buffer
    const audioBuffer = await response.arrayBuffer();

    // Return the audio file
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename="audio.mp3"',
      },
    });
  } catch (error) {
    console.error('Audio generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate audio' },
      { status: 500 }
    );
  }
}
