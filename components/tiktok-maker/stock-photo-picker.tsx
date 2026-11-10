'use client';

import { useState } from 'react';
import { Check, Loader2, Search, Shuffle } from 'lucide-react';
import {
  looksMonochrome,
  MELANCHOLIC_QUERIES,
  searchStockPhotos,
  type StockPhoto,
  type StockSource,
} from '@/lib/tiktok-maker/stock';

interface StockPhotoPickerProps {
  /** Ids currently in use — shown ticked. */
  selectedIds: Set<string>;
  onToggle: (photo: StockPhoto) => void;
}

const inputClass =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none';

/** Pexels + Unsplash search, defaulting to the Grateful Today look. */
export default function StockPhotoPicker({ selectedIds, onToggle }: StockPhotoPickerProps) {
  const [query, setQuery] = useState(MELANCHOLIC_QUERIES[0]);
  const [sources, setSources] = useState<StockSource[]>(['pexels', 'unsplash']);
  const [monoOnly, setMonoOnly] = useState(true);
  const [photos, setPhotos] = useState<StockPhoto[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [presetIdx, setPresetIdx] = useState(0);

  const run = async (q: string, nextPage: number) => {
    if (!q.trim() || sources.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const { photos: found, errors } = await searchStockPhotos(q, sources, nextPage);
      setPhotos((prev) => {
        const base = nextPage === 1 ? [] : prev;
        const seen = new Set(base.map((p) => p.id));
        return [...base, ...found.filter((p) => !seen.has(p.id))];
      });
      setPage(nextPage);
      if (errors.length) setError(errors.join(' · '));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      setLoading(false);
    }
  };

  const shuffle = () => {
    const next = (presetIdx + 1) % MELANCHOLIC_QUERIES.length;
    setPresetIdx(next);
    setQuery(MELANCHOLIC_QUERIES[next]);
    void run(MELANCHOLIC_QUERIES[next], 1);
  };

  const shown = monoOnly ? photos.filter(looksMonochrome) : photos;

  return (
    <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3" data-testid="stock-picker">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run(query, 1);
        }}
      >
        <input className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search stock photos" data-testid="stock-query" />
        <button type="submit" disabled={loading} className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 px-3 text-sm font-medium text-white disabled:opacity-40" data-testid="stock-search">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
        </button>
        <button type="button" onClick={shuffle} disabled={loading} title="Next Grateful Today search" className="inline-flex items-center rounded-lg border border-neutral-300 bg-white px-2.5 text-neutral-700 disabled:opacity-40">
          <Shuffle className="h-4 w-4" />
        </button>
      </form>
      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-600">
        {(['pexels', 'unsplash'] as const).map((s) => (
          <label key={s} className="flex items-center gap-1 capitalize">
            <input
              type="checkbox"
              className="accent-neutral-900"
              checked={sources.includes(s)}
              onChange={(e) => setSources((prev) => (e.target.checked ? [...prev, s] : prev.filter((x) => x !== s)))}
            />
            {s}
          </label>
        ))}
        <label className="flex items-center gap-1">
          <input type="checkbox" className="accent-neutral-900" checked={monoOnly} onChange={(e) => setMonoOnly(e.target.checked)} />
          Only black &amp; white
        </label>
        {photos.length > 0 && (
          <span>
            {shown.length} of {photos.length} shown
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {shown.length > 0 && (
        <div className="grid max-h-96 grid-cols-4 gap-1.5 overflow-y-auto sm:grid-cols-6">
          {shown.map((p) => {
            const picked = selectedIds.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onToggle(p)}
                title={`${p.alt || 'Photo'} — ${p.photographer} (${p.source})`}
                data-testid="stock-photo"
                className={`relative aspect-[9/16] overflow-hidden rounded ${picked ? 'ring-2 ring-neutral-900 ring-offset-1' : ''}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumb} alt={p.alt} loading="lazy" className="h-full w-full object-cover" />
                <span className="absolute bottom-0 left-0 right-0 truncate bg-black/55 px-1 text-left text-[9px] text-white">
                  {p.source === 'pexels' ? 'Pexels' : 'Unsplash'} · {p.photographer}
                </span>
                {picked && (
                  <span className="absolute right-1 top-1 rounded-full bg-neutral-900 p-0.5 text-white">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {photos.length > 0 && (
        <button type="button" onClick={() => run(query, page + 1)} disabled={loading} className="text-xs font-medium text-neutral-700 underline disabled:opacity-40">
          More results
        </button>
      )}
    </div>
  );
}
