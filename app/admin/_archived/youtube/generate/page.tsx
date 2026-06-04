'use client';

import { Card, CardBody, Button, Input, RadioGroup, Radio } from '@heroui/react';
import { Video, Sparkles, Download } from 'lucide-react';
import { useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import { VIDEO_TYPES } from '@/types/youtube';
import type { YouTubeVideoType, YouTubeScript, TextOverlay } from '@/types/youtube';

export default function YouTubeGeneratorPage() {
  const [videoType, setVideoType] = useState<YouTubeVideoType>('gratitude-meditation');
  const [narrationStyle, setNarrationStyle] = useState<
    'full' | 'opening-only' | 'minimal' | 'none'
  >('opening-only');
  const [customPrompt, setCustomPrompt] = useState('');
  const [affirmationsMode, setAffirmationsMode] = useState<'random' | 'topic'>('random');
  const [affirmationsTopic, setAffirmationsTopic] = useState('');
  const [targetDurationMinutes, setTargetDurationMinutes] = useState<15 | 30 | 45 | 60>(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [script, setScript] = useState<YouTubeScript | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/youtube/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoType,
          customPrompt,
          narrationStyle,
          affirmationsMode: videoType === 'daily-affirmations' ? affirmationsMode : undefined,
          affirmationsTopic:
            videoType === 'daily-affirmations' && affirmationsMode === 'topic'
              ? affirmationsTopic
              : undefined,
          targetDurationMinutes:
            videoType === 'daily-affirmations' ? targetDurationMinutes : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setScript(data.script);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copied!`);
  };

  const parseTimeToSeconds = (timeStr: string): number => {
    // Parse formats like "0:30", "1:15", "2:00"
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  };

  const parseDurationToSeconds = (durationStr: string): number => {
    // Parse formats like "45s", "60s", "1m30s"
    const match = durationStr.match(/(\d+)s/);
    return match ? parseInt(match[1]) : 45; // default 45s
  };

  const formatSRTTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = Math.floor((totalSeconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  };

  const generateSRT = (overlays: TextOverlay[]): string => {
    let srt = '';

    overlays.forEach((overlay, index) => {
      const startSeconds = parseTimeToSeconds(overlay.appearAt);
      const durationSeconds = parseDurationToSeconds(overlay.duration);
      const endSeconds = startSeconds + durationSeconds;

      srt += `${index + 1}\n`;
      srt += `${formatSRTTime(startSeconds)} --> ${formatSRTTime(endSeconds)}\n`;
      srt += `${overlay.text}\n\n`;
    });

    return srt;
  };

  const downloadSRT = () => {
    if (!script?.textOverlays || script.textOverlays.length === 0) return;

    const srtContent = generateSRT(script.textOverlays);
    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${script.title.replace(/\s+/g, '-')}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-neutral-50 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-neutral-900 mb-2">YouTube Video Generator</h1>
            <p className="text-lg text-neutral-600">
              Generate faceless gratitude & sobriety video scripts
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Controls */}
            <div className="space-y-6">
              <Card className="border border-neutral-200">
                <CardBody className="p-6 space-y-4">
                  <h2 className="text-xl font-bold text-neutral-900">Video Settings</h2>

                  <RadioGroup
                    label="Video Type"
                    value={videoType}
                    onValueChange={(value) => setVideoType(value as YouTubeVideoType)}
                  >
                    {Object.entries(VIDEO_TYPES).map(([key, { label, description, info }]) => (
                      <Radio key={key} value={key} className="mb-3">
                        <div className="ml-2">
                          <div className="font-semibold text-sm">{label}</div>
                          <div className="text-xs text-neutral-600">{description}</div>
                          <div className="text-xs text-primary mt-0.5 font-medium">{info}</div>
                        </div>
                      </Radio>
                    ))}
                  </RadioGroup>

                  {videoType === 'daily-affirmations' && (
                    <div className="space-y-4 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs">
                      <div className="font-semibold text-primary text-sm">
                        Daily Affirmations Options
                      </div>
                      <div className="space-y-2">
                        <div className="font-medium text-neutral-900">Affirmations Source</div>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { value: 'random', label: 'Random', desc: 'AI chooses affirmations' },
                            {
                              value: 'topic',
                              label: 'Topic-Based',
                              desc: 'AI stays on a theme you choose',
                            },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setAffirmationsMode(opt.value as 'random' | 'topic')}
                              className={`rounded-md px-3 py-2 text-xs font-medium transition-colors text-left ${
                                affirmationsMode === opt.value
                                  ? 'bg-primary text-white'
                                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                              }`}
                            >
                              <div>{opt.label}</div>
                              <div className="text-[10px] opacity-80 mt-0.5">{opt.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {affirmationsMode === 'topic' && (
                        <Input
                          label="Affirmation Topic"
                          size="sm"
                          value={affirmationsTopic}
                          onValueChange={setAffirmationsTopic}
                          placeholder="e.g., early recovery mornings, gratitude for quiet moments"
                        />
                      )}

                      <div className="space-y-2">
                        <div className="font-medium text-neutral-900">Target Length</div>
                        <div className="grid grid-cols-4 gap-2">
                          {[15, 30, 45, 60].map((m) => (
                            <button
                              key={m}
                              onClick={() => setTargetDurationMinutes(m as 15 | 30 | 45 | 60)}
                              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                                targetDurationMinutes === m
                                  ? 'bg-primary text-white'
                                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                              }`}
                            >
                              {m} min
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-neutral-600">
                          The script will loop or vary affirmations to roughly fill this length over
                          an ambient background.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-900">Narration Style</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { value: 'full', label: 'Full', desc: '5-10min voice' },
                        { value: 'opening-only', label: 'Opening', desc: '30sec intro' },
                        { value: 'minimal', label: 'Minimal', desc: 'Brief phrases' },
                        { value: 'none', label: 'None', desc: 'Pure ambient' },
                      ].map((style) => (
                        <button
                          key={style.value}
                          onClick={() => setNarrationStyle(style.value as any)}
                          className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                            narrationStyle === style.value
                              ? 'bg-primary text-white'
                              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                          }`}
                        >
                          <div>{style.label}</div>
                          <div className="text-[10px] opacity-70 mt-0.5">{style.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Input
                    label="Custom Direction (Optional)"
                    value={customPrompt}
                    onValueChange={setCustomPrompt}
                    placeholder="e.g., focus on 90-day milestone, mention morning coffee ritual"
                  />

                  <Button
                    onClick={handleGenerate}
                    isLoading={isGenerating}
                    className="w-full bg-primary text-white"
                    size="lg"
                    startContent={!isGenerating ? <Sparkles className="w-5 h-5" /> : null}
                  >
                    {isGenerating ? 'Generating...' : 'Generate Video Package'}
                  </Button>
                </CardBody>
              </Card>
            </div>

            {/* Preview */}
            <div className="space-y-6">
              {error && (
                <Card className="border border-red-200 bg-red-50">
                  <CardBody className="p-4">
                    <p className="text-red-600">{error}</p>
                  </CardBody>
                </Card>
              )}

              {script && (
                <div className="space-y-4">
                  <Card className="border border-neutral-200">
                    <CardBody className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-neutral-900">Title</h3>
                        <Button
                          size="sm"
                          variant="flat"
                          onClick={() => copyToClipboard(script.title, 'Title')}
                        >
                          Copy
                        </Button>
                      </div>
                      <p className="text-neutral-700">{script.title}</p>
                    </CardBody>
                  </Card>

                  <Card className="border border-primary/20 bg-primary/5">
                    <CardBody className="p-4">
                      <div className="text-sm">
                        <span className="font-semibold">Narration Style:</span>
                        <span className="ml-2 px-2 py-1 bg-primary/20 rounded text-xs font-medium">
                          {script.narrationStyle}
                        </span>
                      </div>
                    </CardBody>
                  </Card>

                  <Card className="border border-neutral-200">
                    <CardBody className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-neutral-900">Description</h3>
                        <Button
                          size="sm"
                          variant="flat"
                          onClick={() => copyToClipboard(script.description, 'Description')}
                        >
                          Copy
                        </Button>
                      </div>
                      <p className="text-neutral-700 whitespace-pre-wrap text-sm">
                        {script.description}
                      </p>
                    </CardBody>
                  </Card>

                  {script.openingNarration && (
                    <Card className="border border-neutral-200">
                      <CardBody className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-neutral-900">
                            Opening Narration (0:00-0:30)
                          </h3>
                          <Button
                            size="sm"
                            variant="flat"
                            onClick={() => copyToClipboard(script.openingNarration!, 'Opening')}
                          >
                            Copy
                          </Button>
                        </div>
                        <p className="text-neutral-700 whitespace-pre-wrap text-sm">
                          {script.openingNarration}
                        </p>
                      </CardBody>
                    </Card>
                  )}

                  {script.fullScript && (
                    <Card className="border border-neutral-200">
                      <CardBody className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-neutral-900">Full Script (ElevenLabs)</h3>
                          <Button
                            size="sm"
                            variant="flat"
                            onClick={() => copyToClipboard(script.fullScript!, 'Script')}
                          >
                            Copy
                          </Button>
                        </div>
                        <p className="text-neutral-700 whitespace-pre-wrap text-sm">
                          {script.fullScript}
                        </p>
                      </CardBody>
                    </Card>
                  )}

                  {/* Legacy script field for backward compatibility */}
                  {script.script && !script.fullScript && (
                    <Card className="border border-neutral-200">
                      <CardBody className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-neutral-900">Script (ElevenLabs)</h3>
                          <Button
                            size="sm"
                            variant="flat"
                            onClick={() => copyToClipboard(script.script!, 'Script')}
                          >
                            Copy
                          </Button>
                        </div>
                        <p className="text-neutral-700 whitespace-pre-wrap text-sm">
                          {script.script}
                        </p>
                      </CardBody>
                    </Card>
                  )}

                  {script.textOverlays && script.textOverlays.length > 0 && (
                    <Card className="border border-neutral-200">
                      <CardBody className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-neutral-900">Text Overlays</h3>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="flat"
                              onClick={downloadSRT}
                              startContent={<Download className="w-4 h-4" />}
                            >
                              Download SRT
                            </Button>
                            <Button
                              size="sm"
                              variant="flat"
                              onClick={() =>
                                copyToClipboard(
                                  script
                                    .textOverlays!.map(
                                      (t) => `${t.appearAt}: "${t.text}" (${t.duration})`
                                    )
                                    .join('\n'),
                                  'Text Overlays'
                                )
                              }
                            >
                              Copy
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {script.textOverlays.map((overlay, i) => (
                            <div key={i} className="border-l-2 border-primary pl-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-primary">
                                  {overlay.appearAt}
                                </span>
                                <span className="text-xs text-neutral-500">
                                  • {overlay.duration}
                                </span>
                              </div>
                              <p className="text-neutral-700 text-sm">{overlay.text}</p>
                            </div>
                          ))}
                        </div>
                      </CardBody>
                    </Card>
                  )}

                  {script.reflectionPrompt && (
                    <Card className="border border-neutral-200">
                      <CardBody className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-neutral-900">Reflection Prompt</h3>
                          <Button
                            size="sm"
                            variant="flat"
                            onClick={() => copyToClipboard(script.reflectionPrompt!, 'Prompt')}
                          >
                            Copy
                          </Button>
                        </div>
                        <p className="text-neutral-700 italic text-sm">{script.reflectionPrompt}</p>
                      </CardBody>
                    </Card>
                  )}

                  <Card className="border border-neutral-200">
                    <CardBody className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-neutral-900">Midjourney Prompt</h3>
                        <Button
                          size="sm"
                          variant="flat"
                          onClick={() => copyToClipboard(script.midjourneyPrompt, 'Midjourney')}
                        >
                          Copy
                        </Button>
                      </div>
                      <p className="text-neutral-700 text-sm">{script.midjourneyPrompt}</p>
                    </CardBody>
                  </Card>

                  <Card className="border border-neutral-200">
                    <CardBody className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-neutral-900">Music Notes</h3>
                        <Button
                          size="sm"
                          variant="flat"
                          onClick={() => copyToClipboard(script.musicNotes, 'Music Notes')}
                        >
                          Copy
                        </Button>
                      </div>
                      <p className="text-neutral-700 text-sm">{script.musicNotes}</p>
                    </CardBody>
                  </Card>

                  {/* Legacy elevenLabsNotes for backward compatibility */}
                  {script.elevenLabsNotes && !script.musicNotes && (
                    <Card className="border border-neutral-200">
                      <CardBody className="p-6">
                        <h3 className="font-bold text-neutral-900 mb-2">ElevenLabs Notes</h3>
                        <p className="text-neutral-700 text-sm">{script.elevenLabsNotes}</p>
                      </CardBody>
                    </Card>
                  )}

                  <Card className="border border-neutral-200">
                    <CardBody className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-neutral-900">Tags</h3>
                        <Button
                          size="sm"
                          variant="flat"
                          onClick={() =>
                            copyToClipboard(script.tags.map((tag) => `#${tag}`).join(', '), 'Tags')
                          }
                        >
                          Copy
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {script.tags.map((tag, i) => (
                          <span key={i} className="px-2 py-1 bg-neutral-100 rounded text-xs">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </CardBody>
                  </Card>

                  <Card className="border border-neutral-200">
                    <CardBody className="p-6">
                      <h3 className="font-bold text-neutral-900 mb-2">Duration</h3>
                      <p className="text-neutral-700">{script.duration}</p>
                    </CardBody>
                  </Card>
                </div>
              )}

              {!script && !error && (
                <Card className="border border-dashed border-neutral-300">
                  <CardBody className="p-12 text-center">
                    <Video className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                    <p className="text-neutral-600">
                      Select a video type and generate your video package
                    </p>
                  </CardBody>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
