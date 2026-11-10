'use client';

import { useState } from 'react';
import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from '@heroui/react';
import { ArchiveRestore, Loader2, Pause, Play, RotateCcw, Sparkles, X } from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import StockPhotoPicker from './stock-photo-picker';
import { Advanced, buttonClass, Field, ghostClass, Group, inputClass } from './controls';
import type { BulkLibrary } from './use-bulk-library';
import type { RenderQueue } from './use-render-queue';
import { stripAudioTags } from '@/lib/tiktok-maker/bulk';

const dayLabel = (s: { day: number; title: string }) => `DAY ${String(s.day).padStart(2, '0')}${s.title ? ` — ${s.title}` : ''}`;

function SideDrawer({
  isOpen,
  onClose,
  title,
  testId,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <Drawer isOpen={isOpen} onOpenChange={(open) => !open && onClose()} placement="right" size="md" backdrop="transparent">
      <DrawerContent>
        <DrawerHeader className="border-b border-neutral-200">{title}</DrawerHeader>
        <DrawerBody className="space-y-5 py-5" data-testid={testId}>
          {children}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

/** Write (Claude) or paste scripts; archived ones live here too. */
export function ScriptsDrawer({ lib, isOpen, onClose }: { lib: BulkLibrary; isOpen: boolean; onClose: () => void }) {
  const [count, setCount] = useState(5);
  const [direction, setDirection] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastAdded, setLastAdded] = useState<number | null>(null);

  return (
    <SideDrawer isOpen={isOpen} onClose={onClose} title="Scripts" testId="scripts-drawer">
      <Group title="Write with the master prompt">
        <div className="grid grid-cols-2 gap-3">
          <Field label="How many">
            <input
              type="number"
              min={1}
              max={20}
              className={inputClass}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              data-testid="script-count"
            />
          </Field>
          <Field label="From day">
            <input
              type="number"
              min={1}
              className={inputClass}
              value={lib.startDay}
              onChange={(e) => lib.setStartDay(Math.max(1, Number(e.target.value) || 1))}
            />
          </Field>
        </div>
        <Field label="Direction (optional)">
          <input
            className={inputClass}
            value={direction}
            placeholder="e.g. memory and forgiveness; one quieter episode"
            onChange={(e) => setDirection(e.target.value)}
          />
        </Field>
        <button
          type="button"
          className={buttonClass}
          disabled={busy || lib.state === 'loading'}
          data-testid="generate-scripts"
          onClick={async () => {
            setBusy(true);
            setLastAdded(null);
            const added = await lib.generate(count, direction);
            setLastAdded(added.length);
            setBusy(false);
          }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? 'Writing…' : 'Write scripts'}
        </button>
        {lastAdded !== null && <p className="text-xs text-neutral-600">{lastAdded} added to the grid and saved.</p>}
        <p className="text-xs text-neutral-500">
          {lib.library.length} scripts in the library — all used for continuity.
        </p>
      </Group>

      <Group title="Paste scripts">
        <textarea
          className={`${inputClass} font-mono text-xs`}
          rows={7}
          value={pasteText}
          data-testid="paste-scripts"
          placeholder={'DAY 12 — THE MIRROR\n[softly] First sentence.\n\n[long pause]\n\n[sadly] Second sentence.'}
          onChange={(e) => setPasteText(e.target.value)}
        />
        <button
          type="button"
          className={ghostClass}
          data-testid="add-pasted"
          onClick={async () => {
            if (await lib.paste(pasteText)) setPasteText('');
          }}
        >
          Add scripts
        </button>
      </Group>
      {lib.error && <p className="text-sm text-red-600">{lib.error}</p>}

      <Advanced>
        {lib.archivedScripts.length === 0 ? (
          <p className="text-xs text-neutral-500">No archived scripts.</p>
        ) : (
          <ul className="space-y-1.5" data-testid="archived-scripts">
            {lib.archivedScripts.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-2 text-xs text-neutral-600">
                <span>
                  <strong>{dayLabel(s)}</strong> — {stripAudioTags(s.script).replace(/\s+/g, ' ').trim()}
                </span>
                <button type="button" className="flex shrink-0 items-center gap-1 underline" onClick={() => lib.restore(s)}>
                  <ArchiveRestore className="h-3 w-3" /> Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </Advanced>
    </SideDrawer>
  );
}

/** The background image pool: uploads, Pexels/Unsplash picks, removed images. */
export function ImagesDrawer({ lib, isOpen, onClose }: { lib: BulkLibrary; isOpen: boolean; onClose: () => void }) {
  const [showRemoved, setShowRemoved] = useState(false);
  return (
    <SideDrawer isOpen={isOpen} onClose={onClose} title={`Images (${lib.images.length})`} testId="images-drawer">
      <Group title="Pool">
        <p className="text-xs text-neutral-500">Videos without a chosen image take one from here in turn.</p>
        <input
          type="file"
          accept="image/*"
          multiple
          data-testid="bulk-images"
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = '';
            void lib.addUploads(files);
          }}
          className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-900 file:px-3 file:py-2 file:text-white"
        />
        {lib.images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {lib.images.map((img, i) => (
              <div key={img.id} className="group relative" data-testid="pool-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.thumb} alt={img.name} title={img.name} className="h-20 w-[45px] rounded object-cover" />
                <span className="absolute left-0.5 top-0.5 rounded bg-black/60 px-1 text-[10px] text-white">{i + 1}</span>
                {img.saveState === 'saving' && (
                  <span className="absolute inset-0 flex items-center justify-center rounded bg-black/40">
                    <Loader2 className="h-3 w-3 animate-spin text-white" />
                  </span>
                )}
                {img.saveState === 'error' && (
                  <span className="absolute bottom-0.5 left-0.5 rounded bg-red-600 px-1 text-[9px] text-white">unsaved</span>
                )}
                <button
                  type="button"
                  aria-label={`Remove image ${i + 1}`}
                  title="Remove from the pool (kept in the library)"
                  onClick={() => void lib.removeImages([img])}
                  className="absolute -right-1 -top-1 hidden rounded-full bg-neutral-900 p-0.5 text-white group-hover:block"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {lib.images.some((img) => img.credit) && (
          <p className="text-xs text-neutral-500" data-testid="credits">
            Credits:{' '}
            {lib.images
              .map((img, i) => (img.credit ? `${i + 1}. ${img.credit}` : null))
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
        {lib.imageError && <p className="text-xs text-red-600">{lib.imageError}</p>}
      </Group>
      <Group title="Find stock photos">
        <StockPhotoPicker
          selectedIds={new Set(lib.images.flatMap((img) => (img.stockId ? [img.stockId] : [])))}
          onToggle={(photo) => void lib.toggleStock(photo)}
        />
      </Group>
      <Advanced>
        {lib.removedImages.length === 0 ? (
          <p className="text-xs text-neutral-500">No removed images.</p>
        ) : (
          <>
            <button type="button" className="text-xs underline" onClick={() => setShowRemoved((v) => !v)}>
              {showRemoved ? 'Hide' : 'Show'} removed images ({lib.removedImages.length})
            </button>
            {showRemoved && (
              <div className="flex flex-wrap gap-2">
                {lib.removedImages.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => void lib.restoreImage(img)}
                    title={`Restore: ${img.name}`}
                    className="relative opacity-60 hover:opacity-100"
                    data-testid="removed-image"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.thumb} alt={img.name} className="h-20 w-[45px] rounded object-cover" />
                    <ArchiveRestore className="absolute bottom-0.5 right-0.5 h-3 w-3 text-white" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </Advanced>
    </SideDrawer>
  );
}

/** The render worker's queue: progress, pause/resume, cancel, retry. */
export function QueueDrawer({
  queue,
  lib,
  isOpen,
  onClose,
  onOpenItem,
}: {
  queue: RenderQueue;
  lib: BulkLibrary;
  isOpen: boolean;
  onClose: () => void;
  onOpenItem: (id: string) => void;
}) {
  const byId = new Map(lib.items.map((i) => [i.id, i]));
  const visible = queue.jobs.filter((j) => j.status !== 'cancelled');
  return (
    <SideDrawer isOpen={isOpen} onClose={onClose} title="Render queue" testId="queue-drawer">
      <Group title="Worker">
        <p className="text-sm text-neutral-700" data-testid="queue-summary">
          {queue.running ? 'Rendering' : queue.queued > 0 ? 'Paused' : 'Idle'} · {queue.queued} queued · {queue.done} done · {queue.failed} failed
        </p>
        <p className="text-xs text-neutral-500">
          Renders one video at a time in this tab and saves each to the library. Keep the tab open; a reload picks up
          where it stopped.
        </p>
        <div className="flex flex-wrap gap-2">
          {queue.running ? (
            <button type="button" className={ghostClass} onClick={queue.pause}>
              <Pause className="h-4 w-4" /> Pause after this one
            </button>
          ) : (
            <button type="button" className={buttonClass} disabled={queue.queued === 0} onClick={() => void queue.run()} data-testid="queue-resume">
              <Play className="h-4 w-4" /> {queue.done + queue.failed > 0 ? 'Resume' : 'Start'} ({queue.queued})
            </button>
          )}
          <button type="button" className={ghostClass} disabled={queue.failed === 0} onClick={() => void queue.retryFailed()}>
            <RotateCcw className="h-4 w-4" /> Retry failed ({queue.failed})
          </button>
          <button type="button" className={ghostClass} disabled={queue.queued === 0} onClick={() => void queue.cancelQueued()}>
            Cancel queued
          </button>
        </div>
        {queue.error && <p className="text-xs text-red-600">{queue.error}</p>}
      </Group>
      <Group title={`Jobs (${visible.length})`}>
        <Virtuoso
          style={{ height: 420 }}
          data={visible}
          computeItemKey={(_, j) => j.id}
          itemContent={(_, j) => {
            const item = byId.get(j.scriptId);
            const progress = queue.current?.jobId === j.id ? ` ${Math.round(queue.current.progress)}%` : '';
            return (
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 border-b border-neutral-100 py-1.5 text-left text-xs"
                onClick={() => item && onOpenItem(item.id)}
              >
                <span className="truncate text-neutral-800">{item ? dayLabel(item) : 'Archived script'}</span>
                <span
                  className={`shrink-0 ${j.status === 'failed' ? 'text-red-600' : j.status === 'done' ? 'text-emerald-700' : 'text-neutral-500'}`}
                  title={j.error ?? undefined}
                >
                  {j.status}
                  {progress}
                </span>
              </button>
            );
          }}
        />
      </Group>
    </SideDrawer>
  );
}
