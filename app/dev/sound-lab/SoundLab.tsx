'use client';

/**
 * The sound lab: one row per variation, one playing at a time. "Compare with
 * plain" swaps to the untreated song at the same moment and back, so you hear
 * exactly what a treatment changes. Verdicts (keep / maybe / drop) and notes
 * are remembered in this browser.
 */
import { useEffect, useRef, useState } from 'react';

export interface Variation {
  id: string;
  group: string;
  title: string;
  about: string;
  length: number;
  /** Seconds into this variation at which the song itself starts (0 for most). */
  songAt: number;
}

type Verdict = 'keep' | 'maybe' | 'drop';
interface Opinion {
  verdict?: Verdict;
  note?: string;
}

const BASE = '/dev-media/sound-lab';
const STORE = 'sound-lab-opinions';
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const VERDICTS: { value: Verdict; label: string; on: string }[] = [
  { value: 'keep', label: 'Keep', on: 'bg-pine text-white border-pine' },
  { value: 'maybe', label: 'Maybe', on: 'bg-gold text-ink border-gold' },
  { value: 'drop', label: 'Drop', on: 'bg-ember text-white border-ember' },
];

export default function SoundLab({ variations }: { variations: Variation[] }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  /** The id whose row is active, and whether we're hearing the plain song in its place. */
  const [active, setActive] = useState<string | null>(null);
  const [plain, setPlain] = useState(false);
  const [time, setTime] = useState(0);
  const [opinions, setOpinions] = useState<Record<string, Opinion>>({});

  useEffect(() => {
    try {
      setOpinions(JSON.parse(localStorage.getItem(STORE) ?? '{}'));
    } catch {}
  }, []);
  const opine = (id: string, patch: Opinion) =>
    setOpinions((all) => {
      const next = { ...all, [id]: { ...all[id], ...patch } };
      try {
        localStorage.setItem(STORE, JSON.stringify(next));
      } catch {}
      return next;
    });

  /** Play `id` (or the plain song in its place) from `at` seconds. */
  const play = async (id: string, usePlain: boolean, at: number) => {
    const el = audio.current;
    if (!el) return;
    const src = `${BASE}/${usePlain ? 'plain' : id}.mp3`;
    if (!el.src.endsWith(src)) {
      el.src = src;
      await new Promise<void>((done) => el.addEventListener('loadedmetadata', () => done(), { once: true }));
    }
    el.currentTime = Math.min(at, Math.max(0, el.duration - 0.1));
    setActive(id);
    setPlain(usePlain);
    await el.play().catch(() => {});
  };
  const toggle = (id: string) => {
    const el = audio.current;
    if (!el) return;
    if (active === id && !el.paused) el.pause();
    else void play(id, false, active === id ? el.currentTime : 0);
  };

  const groups = [...new Set(variations.map((v) => v.group))];
  const kept = variations.filter((v) => opinions[v.id]?.verdict === 'keep');

  return (
    <main className="min-h-screen bg-cream px-4 py-10 text-ink sm:px-8">
      <audio
        ref={audio}
        onPlay={() => setPlaying(active)}
        onPause={() => setPlaying(null)}
        onEnded={() => setPlaying(null)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
      />
      <div className="mx-auto grid max-w-3xl gap-8">
        <header className="grid gap-2">
          <p className="text-xs tracking-[0.18em] text-muted uppercase">Dev tool · sound only</p>
          <h1 className="text-4xl">Sound lab</h1>
          <p className="max-w-2xl text-muted">
            Every sound idea for the song cards, on the same test song. One plays at a time. While one is playing, hold “Plain” to hear the untreated song at
            the same moment. Mark each keep, maybe or drop; it’s remembered in this browser.
          </p>
          {kept.length > 0 && <p className="text-sm">Keeping: {kept.map((v) => v.title).join(' · ')}</p>}
        </header>

        {variations.length === 0 && (
          <p className="rounded-xl border border-line bg-paper p-5 text-sm">
            Nothing rendered yet. Run <code>node scripts/cards/sound-lab.mjs</code> and reload.
          </p>
        )}

        {groups.map((group) => (
          <section key={group} className="grid gap-3">
            <h2 className="text-2xl">{group}</h2>
            <ul className="grid gap-3">
              {variations
                .filter((v) => v.group === group)
                .map((v) => {
                  const on = active === v.id;
                  const isPlaying = playing === v.id;
                  const o = opinions[v.id] ?? {};
                  return (
                    <li key={v.id} className={`grid gap-3 rounded-2xl border bg-paper p-4 ${on ? 'border-pine' : 'border-line'}`}>
                      <div className="flex flex-wrap items-center gap-3">
                        <button type="button" onClick={() => toggle(v.id)} className="w-20 shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-medium text-cream">
                          {isPlaying ? 'Pause' : 'Play'}
                        </button>
                        <h3 className="min-w-0 flex-1 font-sans text-base font-semibold">{v.title}</h3>
                        <span className="text-sm tabular-nums text-muted">
                          {on ? `${fmt(time)} / ` : ''}
                          {fmt(v.length)}
                        </span>
                      </div>
                      <p className="text-sm text-muted">{v.about}</p>
                      {on && (
                        <div className="flex flex-wrap items-center gap-3">
                          <input
                            aria-label={`Position in ${v.title}`}
                            type="range"
                            min={0}
                            max={v.length}
                            step={0.1}
                            value={Math.min(time, v.length)}
                            onChange={(e) => {
                              if (audio.current) audio.current.currentTime = +e.target.value;
                              setTime(+e.target.value);
                            }}
                            className="min-w-0 flex-1 accent-pine"
                          />
                          {v.id !== 'plain' && (
                            <button
                              type="button"
                              // The plain file has no lead-in, so step back by this variation's when comparing, and forward again after.
                              onPointerDown={() => void play(v.id, true, Math.max(0, (audio.current?.currentTime ?? 0) - v.songAt))}
                              onPointerUp={() => void play(v.id, false, (audio.current?.currentTime ?? 0) + v.songAt)}
                              onPointerLeave={() => plain && void play(v.id, false, (audio.current?.currentTime ?? 0) + v.songAt)}
                              className={`rounded-full border px-4 py-1.5 text-sm select-none ${plain ? 'border-ink bg-ink text-cream' : 'border-line hover:border-ink'}`}
                            >
                              {plain ? 'Plain (release to go back)' : 'Hold for plain'}
                            </button>
                          )}
                        </div>
                      )}
                      {v.id !== 'plain' && (
                        <div className="flex flex-wrap items-center gap-2">
                          {VERDICTS.map((d) => (
                            <button
                              key={d.value}
                              type="button"
                              aria-pressed={o.verdict === d.value}
                              onClick={() => opine(v.id, { verdict: o.verdict === d.value ? undefined : d.value })}
                              className={`rounded-full border px-3 py-1 text-sm ${o.verdict === d.value ? d.on : 'border-line hover:border-ink'}`}
                            >
                              {d.label}
                            </button>
                          ))}
                          <input
                            id={`note-${v.id}`}
                            aria-label={`Notes on ${v.title}`}
                            placeholder="Notes: what to change"
                            value={o.note ?? ''}
                            onChange={(e) => opine(v.id, { note: e.target.value })}
                            className="min-w-0 flex-1 rounded-full border border-line bg-cream px-3 py-1 text-sm"
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
