'use client';

import { memo, useEffect, useState } from 'react';
import { AlertCircle, Check, Clock, Loader2, Mic } from 'lucide-react';
import { cachedThumbnail, requestThumbnail } from '@/lib/tiktok-maker/thumbnails';
import type { TikTokSpec } from '@/lib/tiktok-maker/tiktok-video';
import type { RenderJob } from '@/lib/tiktok-maker/bulk';
import type { ItemStatus } from './use-bulk-library';

interface BulkTileProps {
  id: string;
  day: number;
  title: string;
  lines: string[];
  status: ItemStatus;
  jobStatus: RenderJob['status'] | null;
  /** 0–100 while this one is rendering. */
  progress: number | null;
  thumbKey: string;
  thumbSpec: TikTokSpec;
  selected: boolean;
  onOpen: (id: string) => void;
}

/** One video in the grid: a cached still (never a live WebGL canvas) plus its status. */
function BulkTile(props: BulkTileProps) {
  const { thumbKey, thumbSpec } = props;
  const [thumb, setThumb] = useState<string | null>(() => cachedThumbnail(thumbKey));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const hit = cachedThumbnail(thumbKey);
    if (hit) {
      setThumb(hit);
      return;
    }
    setFailed(false);
    let alive = true;
    const { promise, cancel } = requestThumbnail(thumbKey, thumbSpec);
    promise.then((url) => alive && setThumb(url)).catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      cancel();
    };
    // thumbSpec changes whenever thumbKey does; the key is the identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thumbKey]);

  const badge =
    props.jobStatus === 'rendering' ? (
      <span className="flex items-center gap-1 rounded-full bg-neutral-900/80 px-2 py-0.5 text-[10px] text-white">
        <Loader2 className="h-3 w-3 animate-spin" /> {Math.round(props.progress ?? 0)}%
      </span>
    ) : props.jobStatus === 'queued' ? (
      <span className="flex items-center gap-1 rounded-full bg-neutral-900/70 px-2 py-0.5 text-[10px] text-white">
        <Clock className="h-3 w-3" /> queued
      </span>
    ) : props.jobStatus === 'failed' && props.status !== 'rendered' ? (
      <span className="flex items-center gap-1 rounded-full bg-red-600/90 px-2 py-0.5 text-[10px] text-white">
        <AlertCircle className="h-3 w-3" /> failed
      </span>
    ) : props.status === 'rendered' ? (
      <span className="flex items-center gap-1 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[10px] text-white">
        <Check className="h-3 w-3" /> rendered
      </span>
    ) : props.status === 'needs-render' ? (
      <span className="flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[10px] text-neutral-800">
        <Mic className="h-3 w-3" /> voiced
      </span>
    ) : (
      <span className="rounded-full bg-amber-100/90 px-2 py-0.5 text-[10px] text-amber-900">needs voice</span>
    );

  return (
    <button
      type="button"
      onClick={() => props.onOpen(props.id)}
      data-testid="bulk-tile"
      className={`group block w-full text-left ${props.selected ? 'ring-2 ring-neutral-900 ring-offset-2' : ''} rounded-xl`}
    >
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-neutral-900">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-3 text-center font-mono text-[11px] leading-snug text-neutral-400">
            {props.lines.map((l, i) => (
              <span key={i}>{l}</span>
            ))}
            {!failed && <Loader2 className="mt-2 h-3 w-3 animate-spin text-neutral-500" />}
          </div>
        )}
        <div className="absolute left-2 top-2">{badge}</div>
      </div>
      <div className="mt-1.5 px-0.5">
        <p className="truncate text-xs font-semibold text-neutral-900">
          DAY {String(props.day).padStart(2, '0')}
          {props.title ? ` — ${props.title}` : ''}
        </p>
      </div>
    </button>
  );
}

export default memo(BulkTile);
