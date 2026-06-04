'use client';

import { useState } from 'react';
import { Card, CardBody, Button, Textarea, Input, RadioGroup, Radio } from '@heroui/react';
import { FileAudio, Upload, ClipboardCopy } from 'lucide-react';
import AdminGuard from '@/components/AdminGuard';

export default function AudioTranscriberPage() {
  const [file, setFile] = useState<File | null>(null);
  const [hint, setHint] = useState('');
  const [transcript, setTranscript] = useState('');
  const [mode, setMode] = useState<'reflective' | 'raw'>('reflective');
  const [overlays, setOverlays] = useState<
    { id: number; startSec: number; endSec: number; originalText: string; reflectionText: string }[]
  >([]);
  const [segments, setSegments] = useState<
    { id: number; start: number; end: number; text: string }[]
  >([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    setError(null);
  };

  const handleTranscribe = async () => {
    if (!file) {
      setError('Please upload an audio file to transcribe.');
      return;
    }

    setIsTranscribing(true);
    setError(null);
    setTranscript('');
    setOverlays([]);
    setSegments([]);

    try {
      const formData = new FormData();
      formData.append('audio', file);
      if (hint.trim()) {
        formData.append('prompt', hint.trim());
      }
      formData.append('mode', mode);

      const response = await fetch('/api/audio/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to transcribe audio');
      }

      if (data.mode === 'reflective') {
        setTranscript(data.transcript || '');
        setOverlays(data.overlays || []);
        setSegments([]);
      } else {
        setTranscript(data.text || data.transcript || '');
        setOverlays([]);
        setSegments(data.segments || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transcribe audio');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleCopy = async () => {
    if (!transcript) return;
    try {
      await navigator.clipboard.writeText(transcript);
      // simple feedback without bringing in a toast dependency
      alert('Transcript copied to clipboard');
    } catch {
      alert('Unable to copy transcript');
    }
  };

  const handleDownloadTranscript = () => {
    if (!transcript) return;
    try {
      const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcript-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Unable to download transcript');
    }
  };

  const handleCopyReflections = async () => {
    if (!overlays.length) return;
    const text = overlays.map((o) => o.reflectionText).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      alert('Reflections copied to clipboard');
    } catch {
      alert('Unable to copy reflections');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSrtTime = (seconds: number) => {
    const msTotal = Math.round(seconds * 1000);
    const hours = Math.floor(msTotal / 3600000);
    const minutes = Math.floor((msTotal % 3600000) / 60000);
    const secs = Math.floor((msTotal % 60000) / 1000);
    const millis = msTotal % 1000;
    const pad = (n: number, w: number) => n.toString().padStart(w, '0');
    return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)},${pad(millis, 3)}`;
  };

  const handleDownloadSrt = () => {
    const hasOverlays = overlays.length > 0;
    const hasSegments = segments.length > 0;
    if (!hasOverlays && !hasSegments) return;

    type Entry = { index: number; start: number; end: number; text: string };
    const entries: Entry[] = [];

    if (hasOverlays) {
      overlays.forEach((o, idx) => {
        if (o.endSec > o.startSec) {
          entries.push({
            index: idx + 1,
            start: o.startSec,
            end: o.endSec,
            text: o.reflectionText,
          });
        }
      });
    } else if (hasSegments) {
      segments.forEach((s, idx) => {
        if (s.end > s.start && s.text) {
          entries.push({ index: idx + 1, start: s.start, end: s.end, text: s.text });
        }
      });
    }

    if (!entries.length) return;

    const srt = entries
      .map((e) => {
        return `${e.index}\n${formatSrtTime(e.start)} --> ${formatSrtTime(e.end)}\n${e.text}\n`;
      })
      .join('\n');

    try {
      const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcript-${Date.now()}.srt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Unable to download SRT');
    }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <FileAudio className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">Audio Transcriber</h1>
              <p className="text-sm text-neutral-600">
                Upload voiceovers or background audio and either get a clean transcript, or
                reflective on-screen statements with timings.
              </p>
            </div>
          </div>

          {/* Upload Card */}
          <Card>
            <CardBody className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Audio file</label>
                <Input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  startContent={<Upload className="w-4 h-4 text-neutral-500" />}
                />
                <p className="text-xs text-neutral-500">
                  Supports common formats like MP3, WAV, M4A, WebM. Shorter clips will transcribe
                  faster.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Mode</label>
                <RadioGroup
                  orientation="horizontal"
                  value={mode}
                  onValueChange={(value) => setMode(value as 'reflective' | 'raw')}
                  className="text-sm text-neutral-700"
                >
                  <Radio
                    value="reflective"
                    description="Default - generate hopeful overlays with timings"
                  >
                    Reflective overlays
                  </Radio>
                  <Radio value="raw" description="Just transcribe the audio, no rewriting">
                    Raw transcript only
                  </Radio>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">
                  Optional hint / context
                </label>
                <Textarea
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder="e.g. Slow recovery meditation, mention gratitude, sobriety chips, gentle tone..."
                  minRows={3}
                />
                <p className="text-xs text-neutral-500">
                  Whisper will use this to clean up names, brand terms, and style.
                </p>
              </div>

              <Button
                color="primary"
                className="w-full mt-2"
                isDisabled={!file}
                isLoading={isTranscribing}
                onPress={handleTranscribe}
              >
                {isTranscribing ? 'Transcribing...' : 'Transcribe Audio'}
              </Button>
            </CardBody>
          </Card>

          {/* Error */}
          {error && (
            <Card className="border-2 border-red-500">
              <CardBody className="p-4">
                <p className="text-sm text-red-600">{error}</p>
              </CardBody>
            </Card>
          )}

          {/* Reflective overlays */}
          {overlays.length > 0 && (
            <Card className="border border-blue-200 bg-blue-50/60">
              <CardBody className="p-6 space-y-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h2 className="text-lg font-semibold text-neutral-900">Reflective overlays</h2>
                  <Button
                    size="sm"
                    variant="flat"
                    startContent={<ClipboardCopy className="w-4 h-4" />}
                    onPress={handleCopyReflections}
                  >
                    Copy all
                  </Button>
                </div>
                <div className="space-y-3">
                  {overlays.map((o) => {
                    const duration = Math.max(0, o.endSec - o.startSec);
                    return (
                      <div
                        key={o.id}
                        className="rounded-lg border border-blue-100 bg-white/70 p-3 shadow-sm"
                      >
                        <p className="text-xs font-medium text-blue-700 mb-1">
                          {formatTime(o.startSec)} → {formatTime(o.endSec)} ({Math.round(duration)}
                          s)
                        </p>
                        <p className="text-sm text-neutral-900 whitespace-pre-wrap">
                          {o.reflectionText}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Transcript */}
          {transcript && (
            <Card className="border border-green-200 bg-green-50/60">
              <CardBody className="p-6 space-y-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h2 className="text-lg font-semibold text-neutral-900">Transcript</h2>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      startContent={<ClipboardCopy className="w-4 h-4" />}
                      onPress={handleCopy}
                    >
                      Copy
                    </Button>
                    <Button size="sm" variant="flat" onPress={handleDownloadTranscript}>
                      Download .txt
                    </Button>
                    <Button size="sm" variant="flat" onPress={handleDownloadSrt}>
                      Download .srt
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  minRows={10}
                  className="font-mono text-sm"
                />
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
