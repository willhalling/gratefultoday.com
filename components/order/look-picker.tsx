'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { GoButton, Stage } from './order-flow';

export interface PickerClip {
  look: string;
  label: string;
  status: 'rendering' | 'ready' | 'failed';
  url: string | null;
}

/**
 * The buyer swipes through a short clip of their video in each look and
 * picks one. Clips appear as they finish; any ready one can be chosen.
 */
export default function LookPicker({ orderId, name, clips }: { orderId: string; name: string; clips: PickerClip[] }) {
  const router = useRouter();
  // The page re-signs links on every refresh; keep the first so playing clips don't restart.
  const urls = useRef<Record<string, string>>({});
  for (const c of clips) if (c.url && !urls.current[c.look]) urls.current[c.look] = c.url;
  const shown = clips.filter((c) => c.status !== 'failed').map((c) => ({ ...c, url: urls.current[c.look] ?? null }));
  const anyReady = shown.some((c) => c.status === 'ready');
  // Changes whenever a clip arrives, so the centred one starts once it's there.
  const readyKey = shown.map((c) => (c.url ? 1 : 0)).join('');
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rail = useRef<HTMLDivElement>(null);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);

  // Which slide is centred.
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const onScroll = () => {
      const slides = Array.from(el.children) as HTMLElement[];
      const mid = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      slides.forEach((s, i) => {
        if (Math.abs(s.offsetLeft + s.offsetWidth / 2 - mid) < Math.abs(slides[best].offsetLeft + slides[best].offsetWidth / 2 - mid)) best = i;
      });
      setActive(best);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [anyReady]);

  // Only the centred clip plays, from the start, with sound if they asked for it.
  useEffect(() => {
    videos.current.forEach((v, i) => {
      if (!v) return;
      v.muted = muted;
      if (i === active) {
        if (v.paused) {
          v.currentTime = 0;
          v.play().catch(() => {});
        }
      } else {
        v.pause();
      }
    });
  }, [active, muted, readyKey]);

  const goTo = (i: number) => {
    const el = rail.current;
    const slide = el?.children[i] as HTMLElement | undefined;
    if (el && slide) el.scrollTo({ left: slide.offsetLeft - (el.clientWidth - slide.offsetWidth) / 2, behavior: 'smooth' });
  };

  const choose = async () => {
    const clip = shown[active];
    if (!clip || clip.status !== 'ready') return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/choose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ look: clip.look }),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Please try again.');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please try again.');
      setBusy(false);
    }
  };

  if (!anyReady) {
    return (
      <Stage>
        <div className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
          <p className="card-in font-serif text-4xl text-balance sm:text-6xl">Bringing it to life{name ? ` for ${name}` : ''}</p>
          <p className="breathe mt-6 text-white/50">Making four looks to choose from · about a minute</p>
        </div>
      </Stage>
    );
  }

  const current = shown[active];
  return (
    <Stage>
      <div className="flex min-h-[100svh] flex-col items-center justify-between py-6">
        <div className="card-in px-6 text-center">
          <h1 className="font-serif text-3xl sm:text-5xl">Choose the look</h1>
          <p className="mt-2 text-white/50">Swipe to see each one</p>
        </div>

        <div
          ref={rail}
          className="card-in-late my-5 flex w-full snap-x snap-mandatory gap-4 overflow-x-auto px-[calc(50%-min(36vw,170px))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {shown.map((c, i) => (
            <div
              key={c.look}
              onClick={() => i !== active && goTo(i)}
              className={`relative aspect-[9/16] w-[min(72vw,340px)] max-h-[64svh] shrink-0 snap-center overflow-hidden rounded-3xl bg-white/[0.04] transition duration-500 ${
                i === active ? 'scale-100 opacity-100 shadow-[0_0_60px_-12px_rgb(245_197_66/0.35)]' : 'scale-[0.92] cursor-pointer opacity-45'
              }`}
            >
              {c.status === 'ready' && c.url ? (
                <video
                  ref={(v) => {
                    videos.current[i] = v;
                  }}
                  src={c.url}
                  muted
                  loop
                  playsInline
                  preload="auto"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center">
                  <p className="breathe text-white/50">Still making…</p>
                </div>
              )}
              {i === active && c.status === 'ready' && (
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
                  className="absolute top-3 right-3 rounded-full bg-black/45 px-3 py-1.5 text-sm text-white/85 backdrop-blur transition hover:bg-black/65"
                >
                  {muted ? 'Sound on' : 'Sound off'}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4 px-6 text-center">
          <div className="flex items-center gap-2" aria-hidden>
            {shown.map((c, i) => (
              <button
                key={c.look}
                type="button"
                tabIndex={-1}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all ${i === active ? 'w-6 bg-[#f5c542]' : 'w-1.5 bg-white/30'}`}
              />
            ))}
          </div>
          <p className="font-serif text-2xl">{current?.label}</p>
          <GoButton onClick={choose} disabled={busy || current?.status !== 'ready'}>
            {busy ? 'One moment…' : 'Use this look'}
          </GoButton>
          {error && <p className="text-sm text-[#ff9b8a]">{error}</p>}
        </div>
      </div>
    </Stage>
  );
}
