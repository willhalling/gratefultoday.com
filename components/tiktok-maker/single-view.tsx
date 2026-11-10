'use client';

import { useEffect, useMemo, useState } from 'react';
import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from '@heroui/react';
import { Download, FileText, Film, ImageIcon, Loader2, X } from 'lucide-react';
import StockPhotoPicker from './stock-photo-picker';
import TikTokPreview from './tiktok-preview';
import { AudioPicker, buttonClass, Field, ghostClass, Group, inputClass, type AudioFile } from './controls';
import { creditLine, trackStockUse } from '@/lib/tiktok-maker/stock';
import { cleanLines, MAX_LINES, type TypewriterSettings } from '@/lib/tiktok-maker/signature/scene';
import { clipLengthSec, decodeAudioFile, type LineMedia, type TikTokSpec } from '@/lib/tiktok-maker/tiktok-video';

interface LineBackground extends LineMedia {
  name: string;
  /** Object URL to release when replaced (uploads only). */
  local: boolean;
  stockId?: string;
}

interface SingleViewProps {
  baseSpec: TikTokSpec;
  setTypewriter: React.Dispatch<React.SetStateAction<TypewriterSettings>>;
  onDrawerChange: (open: boolean) => void;
  onHasVoiceover: (has: boolean) => void;
  /** The Style drawer is open — close ours. */
  styleOpen: boolean;
}

/** One video: a big live preview, its content in a drawer, export in the toolbar. */
export default function SingleView({ baseSpec, setTypewriter, onDrawerChange, onHasVoiceover, styleOpen }: SingleViewProps) {
  const [contentOpen, setContentOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [image, setImage] = useState<{ name: string; url: string; stockId?: string } | null>(null);
  const [perLine, setPerLine] = useState(false);
  const [lineBackgrounds, setLineBackgrounds] = useState<(LineBackground | null)[]>([]);
  /** Which line the stock picker is choosing for (null = the main image). */
  const [stockTarget, setStockTarget] = useState<number | null>(null);
  const [voiceover, setVoiceover] = useState<AudioFile | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportError, setExportError] = useState('');
  const [result, setResult] = useState<{ url: string; sizeMb: number; durationSec: number } | null>(null);
  const [planInfo, setPlanInfo] = useState<{ cps: number; sped: boolean; overruns: boolean } | null>(null);

  const shownLines = cleanLines(baseSpec.typewriter.lines).filter(Boolean);
  const lineMedia = useMemo(
    () => (perLine ? shownLines.map((_, i) => (lineBackgrounds[i] ? { kind: lineBackgrounds[i]!.kind, url: lineBackgrounds[i]!.url } : null)) : null),
    // shownLines is derived from the lines; its length is what matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [perLine, lineBackgrounds, shownLines.length],
  );
  const spec: TikTokSpec = useMemo(
    () => ({ ...baseSpec, imageUrl: image?.url ?? null, voiceover: voiceover?.buffer ?? null, lineMedia }),
    [baseSpec, image, voiceover, lineMedia],
  );

  const setLineBackground = (index: number, bg: LineBackground | null) =>
    setLineBackgrounds((prev) => {
      const next = [...prev];
      const old = next[index];
      if (old?.local) URL.revokeObjectURL(old.url);
      next[index] = bg;
      return next;
    });
  const lengthSec = clipLengthSec(spec);
  const lines = baseSpec.typewriter.lines;
  const lineCount = lines.filter((l) => l.trim()).length;

  useEffect(() => onDrawerChange(contentOpen), [contentOpen, onDrawerChange]);
  useEffect(() => {
    if (styleOpen) setContentOpen(false);
  }, [styleOpen]);
  useEffect(() => () => onDrawerChange(false), [onDrawerChange]);
  useEffect(() => onHasVoiceover(!!voiceover), [voiceover, onHasVoiceover]);
  useEffect(() => () => {
    if (image && !image.stockId) URL.revokeObjectURL(image.url);
  }, [image]);
  useEffect(() => () => {
    if (result) URL.revokeObjectURL(result.url);
  }, [result]);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    setProgress(0);
    setExportError('');
    setResult(null);
    try {
      const { renderTikTokMp4 } = await import('@/lib/tiktok-maker/tiktok-video');
      const blob = await renderTikTokMp4(spec, { onProgress: setProgress });
      setResult({ url: URL.createObjectURL(blob), sizeMb: blob.size / 1e6, durationSec: lengthSec });
    } catch (err) {
      console.error('[tiktok-maker] export failed:', err);
      setExportError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button type="button" className={ghostClass} onClick={() => setContentOpen(true)} data-testid="open-content">
          <FileText className="h-4 w-4" /> Content
        </button>
        <button type="button" className={buttonClass} onClick={handleExport} disabled={exporting} data-testid="export-mp4">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {exporting ? `Exporting… ${Math.round(progress)}%` : 'Export MP4'}
        </button>
        <span className="text-sm text-neutral-600" data-testid="clip-length">
          {lengthSec.toFixed(2)}s {voiceover ? '(from voiceover)' : lengthSec > baseSpec.sound.defaultLengthSec + 0.01 ? '(stretched to fit the text)' : '(default)'} · {lineCount || 1} line{lineCount > 1 ? 's' : ''}
        </span>
        {planInfo?.sped && !planInfo.overruns && (
          <span className="text-sm text-amber-700">Typing sped up to {planInfo.cps.toFixed(1)} chars/s to fit.</span>
        )}
        {planInfo?.overruns && <span className="text-sm text-red-600">Too much text for this length — shorten the lines.</span>}
        {exportError && <span className="text-sm text-red-600">{exportError}</span>}
      </div>

      <div className="flex flex-wrap items-start justify-center gap-8">
        <div className="w-full max-w-[440px]">
          <TikTokPreview
            spec={spec}
            widthClass="max-w-[440px]"
            onReady={(h) => setPlanInfo(h ? { cps: h.plan.typingCps, sped: h.plan.sped, overruns: h.plan.overruns } : null)}
          />
        </div>
        {result && (
          <div className="w-full max-w-[260px] space-y-2">
            <video src={result.url} controls playsInline className="w-full rounded-lg bg-black" data-testid="export-video" />
            <a href={result.url} download={`tiktok-${Date.now()}.mp4`} className="block text-center text-sm font-medium text-neutral-900 underline">
              Download ({result.sizeMb.toFixed(1)} MB, {result.durationSec.toFixed(2)}s)
            </a>
          </div>
        )}
      </div>

      <Drawer isOpen={contentOpen} onOpenChange={setContentOpen} placement="right" size="md" backdrop="transparent">
        <DrawerContent>
          <DrawerHeader className="border-b border-neutral-200">Content</DrawerHeader>
          <DrawerBody className="space-y-5 py-5" data-testid="content-drawer">
            <Group title="Text">
              <Field label={`Up to ${MAX_LINES} lines — Enter for a new line`}>
                <textarea
                  className={`${inputClass} resize-none font-mono`}
                  rows={MAX_LINES}
                  value={lines.join('\n')}
                  data-testid="lines"
                  onChange={(e) => {
                    const next = e.target.value.split('\n').slice(0, MAX_LINES);
                    setTypewriter((prev) => ({ ...prev, lines: next }));
                  }}
                  onKeyDown={(e) => {
                    // Lines past MAX_LINES are ignored by the typewriter, so don't let one start.
                    if (e.key === 'Enter' && lines.length >= MAX_LINES) e.preventDefault();
                  }}
                />
              </Field>
            </Group>
            <Group title="Background">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  data-testid="image-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setImage({ name: file.name, url: URL.createObjectURL(file) });
                    e.target.value = '';
                  }}
                  className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-900 file:px-3 file:py-2 file:text-white"
                />
                {image && (
                  <button type="button" onClick={() => setImage(null)} className="text-neutral-500 hover:text-neutral-900" aria-label="Remove image">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {image && <span className="block text-xs text-neutral-500">{image.name}</span>}
              <button
                type="button"
                className={ghostClass}
                onClick={() => {
                  setStockTarget(null);
                  setStockOpen((v) => !v);
                }}
              >
                <ImageIcon className="h-4 w-4" /> {stockOpen ? 'Hide stock photos' : 'Find a stock photo'}
              </button>
              {stockOpen && stockTarget === null && (
                <StockPhotoPicker
                  selectedIds={new Set(image?.stockId ? [image.stockId] : [])}
                  onToggle={(photo) => {
                    if (image?.stockId === photo.id) {
                      setImage(null);
                      return;
                    }
                    setImage({ name: creditLine(photo), url: photo.full, stockId: photo.id });
                    void trackStockUse(photo);
                  }}
                />
              )}

              <label className="flex items-center gap-2 pt-2 text-sm font-medium text-neutral-800">
                <input
                  type="checkbox"
                  className="accent-neutral-900"
                  checked={perLine}
                  onChange={(e) => setPerLine(e.target.checked)}
                  data-testid="per-line-toggle"
                />
                Different background per line
              </label>
              {perLine && (
                <div className="space-y-2" data-testid="per-line-list">
                  <p className="text-xs text-neutral-500">
                    Each line&apos;s image or video fades in as that line starts typing. Lines left empty use the main image above.
                  </p>
                  {shownLines.map((line, i) => {
                    const bg = lineBackgrounds[i] ?? null;
                    return (
                      <div key={i} className="rounded-lg border border-neutral-200 p-2" data-testid="per-line-row">
                        <div className="flex items-center gap-2">
                          <span className="w-5 shrink-0 text-xs font-semibold text-neutral-400">{i + 1}</span>
                          <span className="min-w-0 flex-1 truncate font-mono text-xs text-neutral-700">{line}</span>
                          {bg && (
                            <button type="button" onClick={() => setLineBackground(i, null)} className="text-neutral-400 hover:text-neutral-900" aria-label={`Clear line ${i + 1} background`}>
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-7">
                          {bg ? (
                            <span className="flex items-center gap-1 text-xs text-neutral-600">
                              {bg.kind === 'video' ? <Film className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                              <span className="max-w-[12rem] truncate">{bg.name}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-neutral-400">Main image</span>
                          )}
                          <label className="cursor-pointer text-xs font-medium underline">
                            Image
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              data-testid={`line-image-${i}`}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                if (file) setLineBackground(i, { kind: 'image', url: URL.createObjectURL(file), name: file.name, local: true });
                              }}
                            />
                          </label>
                          <label className="cursor-pointer text-xs font-medium underline">
                            Video
                            <input
                              type="file"
                              accept="video/mp4,video/webm,video/quicktime"
                              className="hidden"
                              data-testid={`line-video-${i}`}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                if (file) setLineBackground(i, { kind: 'video', url: URL.createObjectURL(file), name: file.name, local: true });
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            className="text-xs font-medium underline"
                            onClick={() => {
                              setStockTarget(stockTarget === i ? null : i);
                              setStockOpen(false);
                            }}
                          >
                            {stockTarget === i ? 'Hide stock' : 'Stock photo'}
                          </button>
                        </div>
                        {stockTarget === i && (
                          <div className="mt-2">
                            <StockPhotoPicker
                              selectedIds={new Set(bg?.stockId ? [bg.stockId] : [])}
                              onToggle={(photo) => {
                                if (bg?.stockId === photo.id) {
                                  setLineBackground(i, null);
                                  return;
                                }
                                setLineBackground(i, { kind: 'image', url: photo.full, name: creditLine(photo), local: false, stockId: photo.id });
                                void trackStockUse(photo);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Group>
            <Group title="Voiceover">
              <AudioPicker
                label="Voiceover (sets the length)"
                value={voiceover}
                testId="voiceover-upload"
                onPick={async (file) => {
                  setUploadError('');
                  try {
                    setVoiceover({ name: file.name, buffer: await decodeAudioFile(file) });
                  } catch {
                    setUploadError(`Could not decode ${file.name} — try an MP3, WAV or M4A.`);
                  }
                }}
                onClear={() => setVoiceover(null)}
              />
              {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
              <p className="text-xs text-neutral-500">Volumes and the hold after the voiceover are in Style → Sound.</p>
            </Group>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
