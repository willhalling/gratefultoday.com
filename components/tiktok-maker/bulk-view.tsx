'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Clapperboard,
  Download,
  FileText,
  ImageIcon,
  LayoutGrid,
  ListOrdered,
  Loader2,
  Mic,
  Play,
  Rows3,
  Search,
  Square,
  Upload,
} from 'lucide-react';
import { VirtuosoGrid } from 'react-virtuoso';
import BulkTile from './bulk-tile';
import ImportDialog, { planImport, type ImportPlan } from './import-dialog';
import ItemDrawer from './item-drawer';
import ScriptTable, { type SortKey, type TableRow } from './script-table';
import { ImagesDrawer, QueueDrawer, ScriptsDrawer } from './bulk-drawers';
import { buttonClass, ghostClass, inputClass } from './controls';
import { currentTake, itemStatus, useBulkLibrary, type BulkItem, type ItemStatus } from './use-bulk-library';
import { useRenderQueue, type PreparedJob } from './use-render-queue';
import { scriptToLines, slugify, stripAudioTags, type LibraryScript } from '@/lib/tiktok-maker/bulk';
import { downloadText, parseImport, toCsv, type ExportRow } from '@/lib/tiktok-maker/script-io';
import type { TikTokSpec } from '@/lib/tiktok-maker/tiktok-video';

type Filter = 'all' | ItemStatus | 'failed';
type DrawerId = 'scripts' | 'images' | 'queue' | null;
type ViewMode = 'grid' | 'table';
const VIEW_KEY = 'gt-tiktok-bulk-view';

const STATUS_ORDER = ['needs voice', 'voiced', 'queued', 'rendering', 'failed', 'rendered', 'archived'];

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'needs-voice', label: 'Needs voice' },
  { id: 'needs-render', label: 'Needs render' },
  { id: 'rendered', label: 'Rendered' },
  { id: 'failed', label: 'Failed' },
];

function fileName(item: { day: number; title: string }): string {
  return `grateful-today-day-${String(item.day).padStart(2, '0')}${item.title ? `-${slugify(item.title)}` : ''}.mp4`;
}

interface BulkViewProps {
  /** Shared style + music; each video adds its script, voiceover and image. */
  baseSpec: TikTokSpec;
  onDrawerChange: (open: boolean) => void;
  /** The Style drawer is open — close ours. */
  styleOpen: boolean;
}

export default function BulkView({ baseSpec, onDrawerChange, styleOpen }: BulkViewProps) {
  const lib = useBulkLibrary();
  const [drawer, setDrawer] = useState<DrawerId>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<ViewMode>('grid');
  const [showArchived, setShowArchived] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'day', dir: 'asc' });
  const [importPlan, setImportPlan] = useState<ImportPlan | null>(null);
  const [importError, setImportError] = useState('');
  const importInput = useRef<HTMLInputElement>(null);

  // Remember grid/table per browser (a convenience; falls back to grid).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === 'table' || saved === 'grid') setView(saved);
    } catch {
      // Storage blocked.
    }
  }, []);
  const chooseView = (v: ViewMode) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      // Storage blocked.
    }
  };
  const baseSpecRef = useRef(baseSpec);
  baseSpecRef.current = baseSpec;

  // ─── The render worker ─────────────────────────────────────────────────────
  const prepare = useCallback(
    async (scriptId: string): Promise<PreparedJob> => {
      const item = lib.itemsRef.current.find((i) => i.id === scriptId);
      if (!item) throw new Error('Script is archived.');
      const take = currentTake(item);
      if (!take) throw new Error('No voiceover for the current script.');
      if (take.id.startsWith('unsaved-')) throw new Error('Voiceover was not saved to the library — voice it again.');
      const { buffer } = await lib.takeAudio(take.id);
      const image = lib.imageFor(item);
      const lines = lib.linesFor(item);
      const base = baseSpecRef.current;
      const spec: TikTokSpec = {
        ...base,
        imageUrl: image?.url ?? null,
        lineMedia: lib.lineMediaFor(item),
        voiceover: buffer,
        typewriter: { ...base.typewriter, lines },
      };
      return {
        spec,
        fileName: fileName(item),
        voiceoverId: take.id,
        imageId: image && !image.id.startsWith('pending-') ? image.id : null,
        settings: {
          script: item.script,
          lines,
          image: image ? { name: image.name, credit: image.credit } : null,
          lineImageIds: item.lineImageIds,
          typewriter: spec.typewriter,
          background: spec.background,
          sound: spec.sound,
          music: spec.music ? { durationSec: spec.music.duration } : null,
        },
      };
    },
    // lib's functions are stable; items are read through the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const queue = useRenderQueue({ prepare, onRendered: lib.addRender });

  useEffect(() => onDrawerChange(drawer !== null || selectedId !== null), [drawer, selectedId, onDrawerChange]);
  useEffect(() => {
    if (!styleOpen) return;
    setDrawer(null);
    setSelectedId(null);
  }, [styleOpen]);
  useEffect(() => () => onDrawerChange(false), [onDrawerChange]);

  // Warn before leaving mid-save or mid-render.
  const busy = lib.unsaved || queue.running;
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [busy]);

  // ─── Grid data ─────────────────────────────────────────────────────────────
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lib.items.filter((item) => {
      if (filter === 'failed' ? queue.statusFor(item.id) !== 'failed' : filter !== 'all' && itemStatus(item) !== filter)
        return false;
      if (!q) return true;
      return `${item.day} ${item.title} ${item.script}`.toLowerCase().includes(q);
    });
  }, [lib.items, filter, query, queue]);

  // Thumbnails depend on the look, not on sound/voice: key them on exactly that.
  const { lines: _l, sound: _keys, ...typeLook } = baseSpec.typewriter;
  const lookKey = JSON.stringify([typeLook, baseSpec.background]);
  const thumbFor = useCallback(
    (item: BulkItem) => {
      const image = lib.imageFor(item);
      const lines = lib.linesFor(item);
      const spec: TikTokSpec = {
        ...baseSpec,
        music: null,
        voiceover: null,
        imageUrl: image?.url ?? null,
        lineMedia: lib.lineMediaFor(item),
        // Long enough that every line finishes typing in the captured frame.
        sound: { ...baseSpec.sound, defaultLengthSec: 20 },
        typewriter: { ...baseSpec.typewriter, lines, sound: { ...baseSpec.typewriter.sound, enabled: false } },
      };
      return { key: `${lookKey}|${image?.id ?? 'default'}|${(item.lineImageIds ?? []).join(',')}|${lines.join('\n')}`, spec };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lookKey, lib.images, baseSpec],
  );

  const needsRender = lib.items.filter(
    (i) => itemStatus(i) === 'needs-render' && queue.statusFor(i.id) !== 'queued' && queue.statusFor(i.id) !== 'rendering',
  );
  const selected = selectedId ? (lib.items.find((i) => i.id === selectedId) ?? null) : null;

  // ─── Table data (also what Export writes) ─────────────────────────────────
  const statusLabel = useCallback(
    (item: BulkItem) => {
      const job = queue.statusFor(item.id);
      const st = itemStatus(item);
      if (job === 'queued' || job === 'rendering') return job;
      if (job === 'failed' && st !== 'rendered') return 'failed';
      return st === 'needs-voice' ? 'needs voice' : st === 'needs-render' ? 'voiced' : 'rendered';
    },
    [queue],
  );
  const archivedVisible = useMemo(() => {
    if (!showArchived) return [] as LibraryScript[];
    const q = query.trim().toLowerCase();
    return lib.archivedScripts.filter((s) => !q || `${s.day} ${s.title} ${s.script}`.toLowerCase().includes(q));
  }, [showArchived, lib.archivedScripts, query]);
  const tableRows: TableRow[] = useMemo(() => {
    const rows: TableRow[] = [
      ...visible.map((item) => {
        const latest = item.renders[item.renders.length - 1];
        const image = lib.imageFor(item);
        return {
          id: item.id,
          day: item.day,
          title: item.title,
          spoken: stripAudioTags(item.script).replace(/\s+/g, ' ').trim(),
          onScreen: lib.linesFor(item).join(' / '),
          status: statusLabel(item),
          takes: item.takes.length,
          renders: item.renders.length,
          latestRenderUrl: latest?.downloadUrl ?? null,
          imageLabel: item.lineImageIds?.some(Boolean)
            ? 'Per line'
            : image
              ? `${item.imageId === image.id ? '' : 'Auto: '}${image.credit ?? image.name}`
              : 'Default',
          createdAt: item.createdAt,
          archived: false,
        };
      }),
      ...archivedVisible.map((s) => ({
        id: s.id,
        day: s.day,
        title: s.title,
        spoken: stripAudioTags(s.script).replace(/\s+/g, ' ').trim(),
        onScreen: scriptToLines(s.script).join(' / '),
        status: 'archived',
        takes: 0,
        renders: 0,
        latestRenderUrl: null,
        imageLabel: '',
        createdAt: s.createdAt,
        archived: true,
      })),
    ];
    const dir = sort.dir === 'asc' ? 1 : -1;
    const value = (r: TableRow): string | number =>
      sort.key === 'status' ? STATUS_ORDER.indexOf(r.status) : sort.key === 'title' ? r.title.toLowerCase() : r[sort.key];
    return rows.sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir || a.day - b.day;
    });
    // imageFor/linesFor read through refs; images change the labels.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, archivedVisible, sort, statusLabel, lib.images]);

  const exportRows = (): ExportRow[] => {
    const byId = new Map<string, LibraryScript>(lib.library.map((s) => [s.id, s]));
    const items = new Map(lib.items.map((i) => [i.id, i]));
    return tableRows.map((r) => {
      const source = items.get(r.id) ?? byId.get(r.id)!;
      return {
        id: r.id,
        day: r.day,
        title: r.title,
        script: source.script,
        spoken: r.spoken,
        onScreen: r.onScreen,
        status: r.status,
        takes: r.takes,
        renders: r.renders,
        latestRender: r.latestRenderUrl ?? '',
        imageId: source.imageId ?? '',
        source: source.source,
        archived: r.archived,
        createdAt: r.createdAt,
      };
    });
  };
  const exportAs = (format: 'csv' | 'json') => {
    const rows = exportRows();
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'csv') downloadText(toCsv(rows), `grateful-today-scripts-${stamp}.csv`, 'text/csv;charset=utf-8');
    else
      downloadText(
        JSON.stringify({ exportedAt: new Date().toISOString(), scripts: rows }, null, 2),
        `grateful-today-scripts-${stamp}.json`,
        'application/json',
      );
  };
  const readImport = async (file: File) => {
    setImportError('');
    const { rows, errors } = parseImport(await file.text(), file.name);
    if (rows.length === 0) {
      setImportError(errors[0] ?? 'No scripts found in that file.');
      return;
    }
    setImportPlan(planImport(file.name, rows, errors, lib.library));
  };
  const openItem = useCallback((id: string) => {
    setDrawer(null);
    setSelectedId(id);
  }, []);
  const openDrawer = (d: DrawerId) => {
    setSelectedId(null);
    setDrawer(d);
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2" data-testid="bulk-toolbar">
        <button type="button" className={ghostClass} onClick={() => openDrawer('scripts')} data-testid="open-scripts">
          <FileText className="h-4 w-4" /> Scripts
        </button>
        <button type="button" className={ghostClass} onClick={() => openDrawer('images')} data-testid="open-images">
          <ImageIcon className="h-4 w-4" /> Images ({lib.images.length})
        </button>
        <span className="mx-1 h-6 w-px bg-neutral-300" />
        {lib.voicing ? (
          <button type="button" className={ghostClass} onClick={lib.stopVoicing} data-testid="stop-voicing">
            <Loader2 className="h-4 w-4 animate-spin" /> Voicing {lib.voicing.done}/{lib.voicing.total} ·{' '}
            <Square className="h-3 w-3" /> Stop
          </button>
        ) : (
          <button
            type="button"
            className={ghostClass}
            disabled={lib.counts['needs-voice'] === 0}
            onClick={() => void lib.voiceAll()}
            data-testid="voice-all"
          >
            <Mic className="h-4 w-4" /> Voice all ({lib.counts['needs-voice']})
          </button>
        )}
        <button
          type="button"
          className={buttonClass}
          disabled={needsRender.length === 0}
          onClick={() => void queue.enqueue(needsRender.map((i) => i.id))}
          data-testid="render-all"
        >
          <Clapperboard className="h-4 w-4" /> Render all ({needsRender.length})
        </button>
        <button type="button" className={ghostClass} onClick={() => openDrawer('queue')} data-testid="open-queue">
          {queue.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListOrdered className="h-4 w-4" />}
          Queue
          {queue.running && queue.current ? ` · ${Math.round(queue.current.progress)}%` : ''}
          {queue.queued > 0 ? ` · ${queue.queued} waiting` : ''}
          {queue.failed > 0 ? ` · ${queue.failed} failed` : ''}
        </button>
      </div>

      {queue.loaded && !queue.running && queue.queued > 0 && (
        <div
          className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          data-testid="resume-banner"
        >
          {queue.queued} render{queue.queued === 1 ? '' : 's'} waiting in the queue.
          <button type="button" className={buttonClass} onClick={() => void queue.run()}>
            <Play className="h-4 w-4" /> Resume
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            className={`${inputClass} pl-8`}
            placeholder="Search day, title or script"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="bulk-search"
          />
        </div>
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter videos">
          {FILTERS.map((f) => {
            const n =
              f.id === 'all'
                ? lib.items.length
                : f.id === 'failed'
                  ? lib.items.filter((i) => queue.statusFor(i.id) === 'failed').length
                  : lib.counts[f.id];
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${filter === f.id ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-700 ring-1 ring-neutral-300'}`}
              >
                {f.label} ({n})
              </button>
            );
          })}
        </div>
        <span className="text-xs text-neutral-500" data-testid="library-status">
          {lib.state === 'loading' && 'Loading the library…'}
          {lib.state === 'error' && `Library unavailable: ${lib.error}`}
          {lib.state === 'ready' && `Showing ${visible.length} of ${lib.items.length}`}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {view === 'table' && (
            <>
              <label className="flex items-center gap-1.5 text-xs text-neutral-600">
                <input
                  type="checkbox"
                  className="accent-neutral-900"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                />
                Archived ({lib.archivedScripts.length})
              </label>
              <button
                type="button"
                className={ghostClass}
                disabled={tableRows.length === 0}
                onClick={() => exportAs('csv')}
                data-testid="export-csv"
              >
                <Download className="h-4 w-4" /> CSV
              </button>
              <button
                type="button"
                className={ghostClass}
                disabled={tableRows.length === 0}
                onClick={() => exportAs('json')}
                data-testid="export-json"
              >
                <Download className="h-4 w-4" /> JSON
              </button>
              <button
                type="button"
                className={ghostClass}
                disabled={lib.state !== 'ready'}
                onClick={() => importInput.current?.click()}
                data-testid="import-scripts"
              >
                <Upload className="h-4 w-4" /> Import
              </button>
              <input
                ref={importInput}
                type="file"
                accept=".csv,.json,text/csv,application/json"
                className="hidden"
                data-testid="import-file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void readImport(file);
                }}
              />
            </>
          )}
          <div className="inline-flex rounded-lg border border-neutral-300 bg-white p-0.5" role="tablist" aria-label="View">
            {(
              [
                ['grid', LayoutGrid, 'Grid'],
                ['table', Rows3, 'Table'],
              ] as const
            ).map(([v, Icon, label]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => chooseView(v)}
                data-testid={`view-${v}`}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${view === v ? 'bg-neutral-900 text-white' : 'text-neutral-700'}`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {view === 'table' && (
        <p className="-mt-2 mb-3 text-xs text-neutral-500">
          Export writes the rows shown (search, filter and archived toggle apply). Import reads the same CSV/JSON — rows with a
          known id update that script (its previous version is kept); rows without one are added.
          {importError && <span className="ml-1 text-red-600">{importError}</span>}
        </p>
      )}

      {lib.state === 'ready' && lib.items.length === 0 && (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-600">
          No videos yet.{' '}
          <button type="button" className="font-medium underline" onClick={() => openDrawer('scripts')}>
            Write or paste scripts
          </button>{' '}
          to start.
        </div>
      )}

      {view === 'table' && lib.state === 'ready' && tableRows.length > 0 && (
        <ScriptTable
          rows={tableRows}
          sort={sort}
          onSort={(key) => setSort((prev) => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }))}
          onOpen={openItem}
          onRestore={(id) => {
            const script = lib.archivedScripts.find((s) => s.id === id);
            if (script) void lib.restore(script);
          }}
          selectedId={selectedId}
        />
      )}

      {view === 'grid' && lib.state === 'ready' && visible.length > 0 && (
        <VirtuosoGrid
          useWindowScroll
          // Mounted only once there's data, with a first batch to render before
          // the grid has measured anything (otherwise it can stay empty until a resize).
          initialItemCount={Math.min(24, visible.length)}
          data={visible}
          computeItemKey={(_, item) => item.id}
          increaseViewportBy={400}
          listClassName="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          data-testid="bulk-grid"
          itemContent={(_, item) => {
            const { key, spec } = thumbFor(item);
            const jobStatus = queue.statusFor(item.id);
            return (
              <BulkTile
                id={item.id}
                day={item.day}
                title={item.title}
                lines={lib.linesFor(item)}
                status={itemStatus(item)}
                jobStatus={jobStatus}
                progress={queue.current?.scriptId === item.id ? queue.current.progress : null}
                thumbKey={key}
                thumbSpec={spec}
                selected={item.id === selectedId}
                onOpen={openItem}
              />
            );
          }}
        />
      )}

      <ImportDialog
        plan={importPlan}
        onClose={() => setImportPlan(null)}
        onConfirm={(plan, onProgress) =>
          lib.importScripts(
            plan.creates.map(({ day, title, script }) => ({ day, title, script })),
            plan.updates.map(({ id, day, title, script }) => ({ id, day, title, script })),
            onProgress,
          )
        }
      />
      <ItemDrawer item={selected} lib={lib} queue={queue} baseSpec={baseSpec} onClose={() => setSelectedId(null)} />
      <ScriptsDrawer lib={lib} isOpen={drawer === 'scripts'} onClose={() => setDrawer(null)} />
      <ImagesDrawer lib={lib} isOpen={drawer === 'images'} onClose={() => setDrawer(null)} />
      <QueueDrawer lib={lib} queue={queue} isOpen={drawer === 'queue'} onClose={() => setDrawer(null)} onOpenItem={openItem} />
    </div>
  );
}
