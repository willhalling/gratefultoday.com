'use client';

import { useEffect, useMemo, useState } from 'react';
import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from '@heroui/react';
import { Archive, Check, Clapperboard, Loader2, Mic } from 'lucide-react';
import TikTokPreview from './tiktok-preview';
import { Advanced, buttonClass, Field, ghostClass, Group, inputClass } from './controls';
import { currentTake, itemStatus, type BulkItem, type BulkLibrary } from './use-bulk-library';
import type { RenderQueue } from './use-render-queue';
import { stripAudioTags } from '@/lib/tiktok-maker/bulk';
import type { TikTokSpec } from '@/lib/tiktok-maker/tiktok-video';

interface ItemDrawerProps {
  item: BulkItem | null;
  lib: BulkLibrary;
  queue: RenderQueue;
  baseSpec: TikTokSpec;
  onClose: () => void;
}

/** Edit one video: live preview, script, voiceover takes, image and renders. */
export default function ItemDrawer({ item, lib, queue, baseSpec, onClose }: ItemDrawerProps) {
  const [takeId, setTakeId] = useState<string | null>(null);
  const [audio, setAudio] = useState<{ takeId: string; buffer: AudioBuffer; url: string } | null>(null);
  const [audioError, setAudioError] = useState('');

  // Default take: the one spoken from the current script, else the latest.
  const fallbackTake = item ? (currentTake(item) ?? item.takes[item.takes.length - 1] ?? null) : null;
  const activeTakeId = takeId && item?.takes.some((t) => t.id === takeId) ? takeId : (fallbackTake?.id ?? null);

  useEffect(() => setTakeId(null), [item?.id]);
  useEffect(() => {
    if (!activeTakeId) {
      setAudio(null);
      return;
    }
    let alive = true;
    setAudioError('');
    lib
      .takeAudio(activeTakeId)
      .then((a) => alive && setAudio({ takeId: activeTakeId, ...a }))
      .catch((err) => alive && setAudioError(err instanceof Error ? err.message : 'Could not load the voiceover.'));
    return () => {
      alive = false;
    };
    // takeAudio is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTakeId]);

  const image = item ? lib.imageFor(item) : null;
  const lines = item ? lib.linesFor(item) : [];
  const spec: TikTokSpec | null = useMemo(
    () =>
      item
        ? {
            ...baseSpec,
            imageUrl: image?.url ?? null,
            lineMedia: lib.lineMediaFor(item),
            voiceover: audio && audio.takeId === activeTakeId ? audio.buffer : null,
            typewriter: { ...baseSpec.typewriter, lines },
          }
        : null,
    // lines is derived from item.script.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item?.script, item?.id, item?.lineImageIds, lib.images, baseSpec, image?.url, audio, activeTakeId],
  );

  const status = item ? itemStatus(item) : null;
  const jobStatus = item ? queue.statusFor(item.id) : null;
  const rendering = item && queue.current?.scriptId === item.id;
  const stale = item && fallbackTake && fallbackTake.text !== item.script;

  return (
    <Drawer isOpen={!!item} onOpenChange={(open) => !open && onClose()} placement="right" size="md" backdrop="transparent">
      <DrawerContent>
        {item && spec && (
          <>
            <DrawerHeader className="flex items-center gap-2 border-b border-neutral-200 pr-12">
              <span className="text-sm font-semibold text-neutral-500">DAY</span>
              <input
                type="number"
                className="w-16 rounded border border-neutral-300 px-1.5 py-1 text-sm"
                value={item.day}
                onChange={(e) => lib.edit(item.id, { day: Math.max(1, Number(e.target.value) || 1) })}
                aria-label="Day"
              />
              <input
                className="min-w-0 flex-1 rounded border border-neutral-300 px-2 py-1 text-sm font-semibold uppercase"
                value={item.title}
                placeholder="TITLE"
                onChange={(e) => lib.edit(item.id, { title: e.target.value })}
                aria-label="Title"
              />
            </DrawerHeader>
            <DrawerBody className="space-y-5 py-4" data-testid="item-drawer">
              <TikTokPreview spec={spec} widthClass="max-w-[260px]" />

              <Group title="Script">
                <textarea
                  className={`${inputClass} font-mono text-xs`}
                  rows={Math.min(9, Math.max(4, item.script.split('\n').length))}
                  value={item.script}
                  onChange={(e) => lib.edit(item.id, { script: e.target.value })}
                  data-testid="item-script"
                />
                <p className="text-xs text-neutral-500">
                  On screen: {lines.length ? lines.map((l) => `“${l}”`).join(' / ') : '—'}
                </p>
                <p className="text-[11px] text-neutral-400" data-testid="item-save-state">
                  {item.saveState === 'saved' && (
                    <span className="inline-flex items-center gap-1">
                      <Check className="h-3 w-3" /> Saved
                    </span>
                  )}
                  {item.saveState === 'saving' && 'Saving…'}
                  {item.saveState === 'error' && <span className="text-red-600">Not saved — edit again to retry</span>}
                </p>
              </Group>

              <Group title="Voiceover">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className={ghostClass} disabled={item.voBusy || !!lib.voicing} onClick={() => lib.voice(item.id)} data-testid="item-voice">
                    {item.voBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                    {item.takes.length === 0 ? 'Voice' : stale ? 'Re-voice (script changed)' : 'New take'}
                  </button>
                  {item.takes.length > 1 && (
                    <select
                      className="rounded border border-neutral-300 px-2 py-1 text-xs"
                      value={activeTakeId ?? ''}
                      onChange={(e) => setTakeId(e.target.value)}
                      aria-label="Voiceover take"
                      data-testid="take-select"
                    >
                      {item.takes.map((t, i) => (
                        <option key={t.id} value={t.id}>
                          Take {i + 1}
                          {t.text !== item.script ? ' (old script)' : ''} · {new Date(t.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {audio && audio.takeId === activeTakeId && (
                  <div className="flex items-center gap-2">
                    <audio src={audio.url} controls className="h-8 w-full" />
                    <span className="shrink-0 text-xs text-neutral-500">{audio.buffer.duration.toFixed(1)}s</span>
                  </div>
                )}
                {audioError && <p className="text-xs text-red-600">{audioError}</p>}
                <Advanced>
                  <Field label="Voice delivery (new takes)">
                    <select className={inputClass} value={lib.stability} onChange={(e) => lib.setStability(Number(e.target.value))}>
                      <option value={0}>Creative (most expressive)</option>
                      <option value={0.5}>Natural</option>
                      <option value={1}>Robust (steadiest)</option>
                    </select>
                  </Field>
                  {stale && (
                    <p className="text-xs text-amber-700">
                      The selected take was spoken from an earlier version of the script: “
                      {stripAudioTags(fallbackTake!.text).replace(/\s+/g, ' ').trim()}”
                    </p>
                  )}
                </Advanced>
              </Group>

              <Group title="Background image">
                {lib.images.length === 0 ? (
                  <p className="text-xs text-neutral-500">No images in the pool yet — add some from Images.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5" data-testid="item-images">
                    <button
                      type="button"
                      onClick={() => lib.chooseImage(item.id, null)}
                      className={`flex h-16 w-9 items-center justify-center rounded border text-[9px] ${item.imageId && lib.images.some((i) => i.id === item.imageId) ? 'border-neutral-300 text-neutral-500' : 'border-neutral-900 font-semibold text-neutral-900'}`}
                      title="Auto: the pool's pick for this position"
                    >
                      Auto
                    </button>
                    {lib.images.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        disabled={img.id.startsWith('pending-')}
                        onClick={() => lib.chooseImage(item.id, img.id)}
                        title={img.name}
                        className={`overflow-hidden rounded ${item.imageId === img.id ? 'ring-2 ring-neutral-900 ring-offset-1' : 'opacity-80 hover:opacity-100'}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.thumb} alt={img.name} className="h-16 w-9 object-cover" />
                      </button>
                    ))}
                  </div>
                )}
                {image?.credit && <p className="text-xs text-neutral-500">{image.credit}</p>}
                {lib.images.length > 0 && (
                  <label className="flex items-center gap-2 pt-1 text-sm font-medium text-neutral-800">
                    <input
                      type="checkbox"
                      className="accent-neutral-900"
                      checked={!!item.lineImageIds}
                      data-testid="item-per-line-toggle"
                      onChange={(e) => void lib.setLineImages(item.id, e.target.checked ? lines.map(() => null) : null)}
                    />
                    Different image per line
                  </label>
                )}
                {item.lineImageIds && (
                  <div className="space-y-1.5" data-testid="item-per-line">
                    <p className="text-xs text-neutral-500">Each line&apos;s image fades in as it starts typing; “Video&apos;s image” uses the one above.</p>
                    {lines.map((line, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-4 shrink-0 text-xs font-semibold text-neutral-400">{i + 1}</span>
                        <span className="min-w-0 flex-1 truncate font-mono text-xs text-neutral-700">{line}</span>
                        <select
                          className="w-32 shrink-0 rounded border border-neutral-300 px-1.5 py-1 text-xs"
                          value={item.lineImageIds?.[i] ?? ''}
                          aria-label={`Image for line ${i + 1}`}
                          onChange={(e) => {
                            const next = lines.map((_, j) => item.lineImageIds?.[j] ?? null);
                            next[i] = e.target.value || null;
                            void lib.setLineImages(item.id, next);
                          }}
                        >
                          <option value="">Video&apos;s image</option>
                          {lib.images.map((img, n) =>
                            img.id.startsWith('pending-') ? null : (
                              <option key={img.id} value={img.id}>
                                Image {n + 1}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </Group>

              <Group title="Render">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className={buttonClass}
                    disabled={status === 'needs-voice' || jobStatus === 'queued' || jobStatus === 'rendering'}
                    onClick={() => queue.enqueue([item.id])}
                    data-testid="item-render"
                  >
                    <Clapperboard className="h-4 w-4" />
                    {rendering
                      ? `Rendering… ${Math.round(queue.current?.progress ?? 0)}%`
                      : jobStatus === 'queued'
                        ? 'Queued'
                        : status === 'rendered'
                          ? 'Render again'
                          : 'Render'}
                  </button>
                  {status === 'needs-voice' && <span className="text-xs text-neutral-500">Voice the current script first.</span>}
                </div>
                {item.renders.length > 0 && (
                  <ul className="space-y-1 text-xs text-neutral-700" data-testid="item-renders">
                    {[...item.renders].reverse().map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-2">
                        <a href={r.downloadUrl} className="underline" target="_blank" rel="noreferrer">
                          {new Date(r.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} · {r.durationSec.toFixed(2)}s ·{' '}
                          {(r.bytes / 1e6).toFixed(1)} MB
                        </a>
                        {r.settings?.script !== item.script && <span className="text-neutral-400">older script</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </Group>

              {item.error && <p className="text-sm text-red-600">{item.error}</p>}

              <button
                type="button"
                className={`${ghostClass} self-start`}
                onClick={() => {
                  void lib.archive(item.id);
                  onClose();
                }}
                title="Kept in the library — restore any time from Scripts"
              >
                <Archive className="h-4 w-4" /> Archive this video
              </button>
            </DrawerBody>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
