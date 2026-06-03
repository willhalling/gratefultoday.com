'use client';

import { Card, CardBody, Button, Input, Slider, Select, SelectItem, Textarea } from '@heroui/react';
import { Music, Download, Play, Pause } from 'lucide-react';
import { useState } from 'react';
import AdminGuard from '@/components/AdminGuard';

// Popular ElevenLabs voices
const VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Calm Female)' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi (Strong Female)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (Soft Female)' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (Well-Rounded Male)' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold (Crisp Male)' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (Deep Male)' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam (Raspy Male)' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh (Young Male)' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie (Casual Male)' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel (Deep Authoritative)' },
];

const MODELS = [
  { id: 'eleven_multilingual_v2', name: 'Multilingual V2 (Best Quality)' },
  { id: 'eleven_monolingual_v1', name: 'Monolingual V1 (English)' },
  { id: 'eleven_turbo_v2', name: 'Turbo V2 (Fastest)' },
];

const EXAMPLE_SCRIPTS = {
  meditation: `This is your moment <break time="2s"/> 
A space to pause <break time="1s"/> to breathe <break time="2s"/> to simply be.

Let the world fade <break time="3s"/> 
There's nowhere to rush to <break time="2s"/> 
Nothing to fix right now <break time="3s"/>

Just this breath <break time="2s"/> this moment <break time="2s"/> this peace.`,

  recovery: `You've made it through another day <break time="2s"/> 
That counts <break time="3s"/>

Every moment of choosing yourself <break time="2s"/> 
Every time you didn't give in <break time="3s"/> 
That's strength <break time="2s"/> That's real.

Keep going <break time="2s"/> One day at a time.`,

  gratitude: `Pause for a moment <break time="2s"/> 
Look around <break time="3s"/>

What's one thing <break time="1s"/> just one <break time="2s"/> 
that you can appreciate right now?

Maybe it's small <break time="2s"/> 
Maybe it seems simple <break time="3s"/> 
But it's yours <break time="2s"/> and it matters.`,
};

export default function AudioGeneratorPage() {
  const [text, setText] = useState('');
  const [voiceId, setVoiceId] = useState('3Q0HiHNecynsdqicntLT');
  const [modelId, setModelId] = useState('eleven_multilingual_v2');
  const [stability, setStability] = useState(0.5);
  const [similarityBoost, setSimilarityBoost] = useState(0.62);
  const [style, setStyle] = useState(0.0);
  const [speed, setSpeed] = useState(0.75);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setAudioUrl(null);

    // Stop any playing audio
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }

    try {
      const response = await fetch('/api/audio/elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceId,
          modelId,
          stability,
          similarityBoost,
          style,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate audio');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      // Create audio element for playback
      const audio = new Audio(url);
      audio.playbackRate = speed;
      audio.onended = () => setIsPlaying(false);
      setAudioElement(audio);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate audio');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayPause = () => {
    if (!audioElement) return;

    if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      audioElement.playbackRate = speed;
      audioElement.play();
      setIsPlaying(true);
      audioElement.play();
      setIsPlaying(true);
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;

    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `audio-${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const loadExample = (type: keyof typeof EXAMPLE_SCRIPTS) => {
    setText(EXAMPLE_SCRIPTS[type]);
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Music className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-neutral-900">Audio Generator</h1>
          </div>

          <div className="space-y-6">
            {/* Script Input */}
            <Card>
              <CardBody className="p-6">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900 mb-2">Script with SSML</h2>
                    <p className="text-sm text-neutral-600 mb-4">
                      Use{' '}
                      <code className="bg-neutral-100 px-2 py-1 rounded text-xs">
                        &lt;break time=&quot;2s&quot;/&gt;
                      </code>{' '}
                      for pauses
                    </p>
                    <Textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Enter your script with SSML break tags..."
                      minRows={10}
                      className="font-mono text-sm"
                    />
                  </div>

                  {/* Example Scripts */}
                  <div className="flex gap-2 flex-wrap">
                    <p className="text-sm text-neutral-600 w-full mb-1">Quick examples:</p>
                    <Button size="sm" variant="flat" onPress={() => loadExample('meditation')}>
                      Meditation
                    </Button>
                    <Button size="sm" variant="flat" onPress={() => loadExample('recovery')}>
                      Recovery
                    </Button>
                    <Button size="sm" variant="flat" onPress={() => loadExample('gratitude')}>
                      Gratitude
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Voice Settings */}
            <Card>
              <CardBody className="p-6">
                <h2 className="text-xl font-bold text-neutral-900 mb-4">Voice Settings</h2>
                <div className="space-y-4">
                  <Select
                    label="Voice"
                    selectedKeys={[voiceId]}
                    onChange={(e) => setVoiceId(e.target.value)}
                  >
                    {VOICES.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        {voice.name}
                      </SelectItem>
                    ))}
                  </Select>

                  <Select
                    label="Model"
                    selectedKeys={[modelId]}
                    onChange={(e) => setModelId(e.target.value)}
                  >
                    {MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </Select>

                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-2 block">
                      Stability: {stability.toFixed(2)}
                    </label>
                    <Slider
                      value={stability}
                      onChange={(value) => setStability(value as number)}
                      min={0}
                      max={1}
                      step={0.05}
                      className="max-w-md"
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      Lower = more expressive, Higher = more stable
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-2 block">
                      Similarity Boost: {similarityBoost.toFixed(2)}
                    </label>
                    <Slider
                      value={similarityBoost}
                      onChange={(value) => setSimilarityBoost(value as number)}
                      min={0}
                      max={1}
                      step={0.05}
                      className="max-w-md"
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      Lower = more variation, Higher = closer to original voice
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-2 block">
                      Style: {style.toFixed(2)}
                    </label>
                    <Slider
                      value={style}
                      onChange={(value) => setStyle(value as number)}
                      min={0}
                      max={1}
                      step={0.05}
                      className="max-w-md"
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      How much the voice should express emotion and tone
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-2 block">
                      Speed: {speed.toFixed(2)}x
                    </label>
                    <Slider
                      value={speed}
                      onChange={(value) => {
                        setSpeed(value as number);
                        if (audioElement) {
                          audioElement.playbackRate = value as number;
                        }
                      }}
                      min={0.5}
                      max={1.5}
                      step={0.05}
                      className="max-w-md"
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      0.75x recommended for slow meditation (very calming)
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Generate Button */}
            <Button
              color="primary"
              size="lg"
              className="w-full"
              onPress={handleGenerate}
              isLoading={isGenerating}
              isDisabled={!text.trim()}
              startContent={!isGenerating && <Music />}
            >
              {isGenerating ? 'Generating Audio...' : 'Generate Audio'}
            </Button>

            {/* Error Display */}
            {error && (
              <Card className="border-2 border-red-500">
                <CardBody className="p-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </CardBody>
              </Card>
            )}

            {/* Audio Player */}
            {audioUrl && (
              <Card className="border-2 border-green-500">
                <CardBody className="p-6">
                  <h3 className="text-lg font-bold text-neutral-900 mb-4">Generated Audio</h3>
                  <div className="flex gap-3">
                    <Button
                      color={isPlaying ? 'warning' : 'success'}
                      onPress={handlePlayPause}
                      startContent={isPlaying ? <Pause /> : <Play />}
                    >
                      {isPlaying ? 'Pause' : 'Play'}
                    </Button>
                    <Button
                      color="primary"
                      variant="flat"
                      onPress={handleDownload}
                      startContent={<Download />}
                    >
                      Download MP3
                    </Button>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Instructions */}
            <Card className="bg-blue-50">
              <CardBody className="p-6">
                <h3 className="text-lg font-bold text-neutral-900 mb-3">
                  SSML Break Tag Reference
                </h3>
                <div className="space-y-2 text-sm text-neutral-700">
                  <p>
                    <code className="bg-white px-2 py-1 rounded">
                      &lt;break time=&quot;1s&quot;/&gt;
                    </code>{' '}
                    - Short pause (1 second)
                  </p>
                  <p>
                    <code className="bg-white px-2 py-1 rounded">
                      &lt;break time=&quot;2s&quot;/&gt;
                    </code>{' '}
                    - Medium pause (2 seconds)
                  </p>
                  <p>
                    <code className="bg-white px-2 py-1 rounded">
                      &lt;break time=&quot;3s&quot;/&gt;
                    </code>{' '}
                    - Long pause (3 seconds)
                  </p>
                  <p>
                    <code className="bg-white px-2 py-1 rounded">
                      &lt;break time=&quot;5s&quot;/&gt;
                    </code>{' '}
                    - Extended meditative pause
                  </p>
                  <p className="pt-2 text-neutral-600 italic">
                    These pauses work perfectly with your YouTube script generator's timing
                    requirements.
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
