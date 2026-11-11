'use client';

/**
 * The room-sound tool: one recording, a list of rooms, switch between them
 * while it plays (keys 0–9), loudness matched so the comparison is fair, then
 * download the winner with its tail left to ring out.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  blend,
  buildWet,
  finish,
  makeupGain,
  prepareIr,
  renderRoom,
  toWav,
  type RoomSettings,
} from '@/lib/room-sound';

const BASE = '/dev-media/room-sound';

interface Room {
  id: string;
  label: string;
  raw: AudioBuffer | null;
  note?: string;
  defaults: RoomSettings;
}

/** Modelled rooms come from scripts/make-room-irs.mjs (ours, no licence); the rest are roughclip's OpenAIR recordings. */
const MODELLED = 'Modelled, not recorded';
const BUILT_IN: { id: string; label: string; file: string; note?: string; defaults: RoomSettings }[] = [
  { id: 'bedroom', label: 'Bedroom', file: 'modelled-bedroom.wav', note: `${MODELLED} · soft, close`, defaults: { amount: 0.22, preDelay: 0.003, highCut: 9000, lowCut: 120, tail: 0.7 } },
  { id: 'living-room', label: 'Living room', file: 'modelled-living-room.wav', note: `${MODELLED} · sofa, carpet, curtains`, defaults: { amount: 0.22, preDelay: 0.005, highCut: 9000, lowCut: 120, tail: 0.9 } },
  { id: 'kitchen', label: 'Kitchen', file: 'modelled-kitchen.wav', note: `${MODELLED} · hard surfaces`, defaults: { amount: 0.2, preDelay: 0.004, highCut: 10000, lowCut: 150, tail: 1.1 } },
  { id: 'bathroom', label: 'Bathroom', file: 'modelled-bathroom.wav', note: `${MODELLED} · tiles`, defaults: { amount: 0.25, preDelay: 0.002, highCut: 11000, lowCut: 180, tail: 1.7 } },
  { id: 'hallway', label: 'Hallway', file: 'modelled-hallway.wav', note: `${MODELLED} · long and narrow`, defaults: { amount: 0.22, preDelay: 0.006, highCut: 9000, lowCut: 150, tail: 1.4 } },
  { id: 'car', label: 'Car', file: 'modelled-car.wav', note: `${MODELLED} · boxy, very dry`, defaults: { amount: 0.3, preDelay: 0, highCut: 8000, lowCut: 100, tail: 0.25 } },
  { id: 'small-room', label: 'Small room', file: 'small-room.wav', note: 'Recorded (OpenAIR)', defaults: { amount: 0.2, preDelay: 0.005, highCut: 8000, lowCut: 150, tail: 1.2 } },
  { id: 'village-hall', label: 'Village hall', file: 'modelled-village-hall.wav', note: MODELLED, defaults: { amount: 0.28, preDelay: 0.015, highCut: 7500, lowCut: 130, tail: 2.4 } },
  { id: 'chapel', label: 'Chapel', file: 'modelled-chapel.wav', note: MODELLED, defaults: { amount: 0.3, preDelay: 0.02, highCut: 7000, lowCut: 130, tail: 4 } },
  { id: 'ancient-chamber', label: 'Ancient chamber', file: 'ancient-chamber.wav', note: 'Recorded (OpenAIR)', defaults: { amount: 0.25, preDelay: 0.01, highCut: 7000, lowCut: 150, tail: 1 } },
  { id: 'concert-hall', label: 'Concert hall', file: 'concert-hall.wav', note: 'Recorded (OpenAIR)', defaults: { amount: 0.3, preDelay: 0.02, highCut: 6500, lowCut: 120, tail: 3 } },
  { id: 'church', label: 'Church', file: 'church.wav', note: 'Recorded (OpenAIR)', defaults: { amount: 0.3, preDelay: 0.025, highCut: 6000, lowCut: 150, tail: 4 } },
  { id: 'cathedral', label: 'Cathedral', file: 'cathedral.wav', note: 'Recorded (OpenAIR)', defaults: { amount: 0.3, preDelay: 0.03, highCut: 5500, lowCut: 150, tail: 6 } },
];

const DRY: Room = { id: 'dry', label: 'Dry (as recorded)', raw: null, defaults: DEFAULT_SETTINGS };

const SAMPLES = [
  { label: 'Speech sample', file: `${BASE}/sample-speech.mp3` },
  { label: 'Music sample (choir)', file: `${BASE}/sample-music.mp3` },
];

type Wet = ReturnType<typeof buildWet>;

/** The live graph: source → send → { dry, room } → master (loudness match) → speakers. */
class Player {
  ctx: AudioContext;
  master: GainNode;
  dry: GainNode;
  send: GainNode;
  wet: Wet | null = null;
  node: AudioBufferSourceNode | null = null;
  buffer: AudioBuffer | null = null;
  startedAt = 0;
  offset = 0;
  playing = false;
  loop = true;
  onEnded: () => void = () => {};

  constructor() {
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.dry = this.ctx.createGain();
    this.send = this.ctx.createGain();
    this.send.connect(this.dry).connect(this.master).connect(this.ctx.destination);
  }

  setSource(buf: AudioBuffer) {
    this.stopNode();
    this.buffer = buf;
    this.offset = 0;
    this.playing = false;
  }

  position() {
    if (!this.buffer) return 0;
    if (!this.playing) return this.offset;
    const t = this.offset + this.ctx.currentTime - this.startedAt;
    return this.loop ? t % this.buffer.duration : Math.min(t, this.buffer.duration);
  }

  async play(from = this.offset) {
    if (!this.buffer) return;
    await this.ctx.resume();
    this.stopNode();
    const node = this.ctx.createBufferSource();
    node.buffer = this.buffer;
    node.loop = this.loop;
    node.connect(this.send);
    node.onended = () => {
      if (this.node === node) {
        this.playing = false;
        this.offset = 0;
        this.node = null;
        this.onEnded();
      }
    };
    this.offset = from;
    this.startedAt = this.ctx.currentTime;
    node.start(0, from);
    this.node = node;
    this.playing = true;
  }

  pause() {
    this.offset = this.position();
    this.stopNode();
    this.playing = false;
  }

  seek(t: number) {
    if (this.playing) void this.play(t);
    else this.offset = t;
  }

  private stopNode() {
    const n = this.node;
    this.node = null;
    if (n) {
      n.onended = null;
      try {
        n.stop();
      } catch {}
      n.disconnect();
    }
  }

  /** Switch rooms: a fresh wet path crossfaded in, the old one faded out. */
  applyRoom(ir: AudioBuffer | null, s: RoomSettings) {
    const now = this.ctx.currentTime;
    const old = this.wet;
    this.wet = null;
    if (ir) {
      const w = buildWet(this.ctx, ir, s);
      w.output.gain.value = 0;
      this.send.connect(w.input);
      w.output.connect(this.master);
      w.output.gain.setTargetAtTime(blend(s.amount).wet, now, 0.03);
      this.wet = w;
    }
    this.dry.gain.setTargetAtTime(ir ? blend(s.amount).dry : 1, now, 0.03);
    if (old) {
      old.output.gain.setTargetAtTime(0, now, 0.03);
      setTimeout(() => {
        try {
          this.send.disconnect(old.input);
        } catch {}
        old.output.disconnect();
      }, 300);
    }
  }

  updateParams(s: RoomSettings) {
    const now = this.ctx.currentTime;
    if (!this.wet) return;
    this.wet.preDelay.delayTime.setTargetAtTime(s.preDelay, now, 0.02);
    this.wet.low.frequency.setTargetAtTime(s.lowCut, now, 0.02);
    this.wet.high.frequency.setTargetAtTime(s.highCut, now, 0.02);
    this.wet.output.gain.setTargetAtTime(blend(s.amount).wet, now, 0.03);
    this.dry.gain.setTargetAtTime(blend(s.amount).dry, now, 0.03);
  }

  setMakeup(g: number) {
    this.master.gain.setTargetAtTime(g, this.ctx.currentTime, 0.08);
  }
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const db = (g: number) => `${g >= 1 ? '+' : ''}${(20 * Math.log10(g)).toFixed(1)} dB`;

function Slider({
  id,
  label,
  value,
  min,
  max,
  step,
  show,
  hint,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  show: string;
  hint: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <span className="text-sm tabular-nums text-muted">{show}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full accent-pine" />
      <p className="text-xs text-muted">{hint}</p>
    </div>
  );
}

export default function RoomSound() {
  const player = useRef<Player | null>(null);
  const irCache = useRef(new Map<string, AudioBuffer>());
  const [rooms, setRooms] = useState<Room[]>([DRY]);
  const [activeId, setActiveId] = useState('dry');
  const [settings, setSettings] = useState<Record<string, RoomSettings>>({});
  const [source, setSource] = useState<{ name: string; buffer: AudioBuffer } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [loop, setLoop] = useState(true);
  const [matched, setMatched] = useState(true);
  const [makeup, setMakeup] = useState(1);
  const [status, setStatus] = useState('');
  const [download, setDownload] = useState<{ url: string; name: string; note: string } | null>(null);
  const [dragging, setDragging] = useState(false);

  const getPlayer = useCallback(() => (player.current ??= new Player()), []);
  const active = rooms.find((r) => r.id === activeId) ?? DRY;
  const s = settings[activeId] ?? active.defaults;

  const irFor = useCallback(
    (room: Room, tail: number) => {
      if (!room.raw) return null;
      const key = `${room.id}|${tail}`;
      let ir = irCache.current.get(key);
      if (!ir) {
        ir = prepareIr(getPlayer().ctx, room.raw, tail);
        irCache.current.set(key, ir);
      }
      return ir;
    },
    [getPlayer],
  );

  // Load the built-in rooms.
  useEffect(() => {
    let cancelled = false;
    const p = getPlayer();
    p.onEnded = () => setPlaying(false);
    Promise.all(
      BUILT_IN.map(async (r) => {
        try {
          const res = await fetch(`${BASE}/rooms/${r.file}`);
          if (!res.ok) throw new Error(String(res.status));
          const raw = await p.ctx.decodeAudioData(await res.arrayBuffer());
          return {
            id: r.id,
            label: r.label,
            raw,
            defaults: r.defaults,
            note: [r.note, raw.numberOfChannels >= 4 ? `${raw.numberOfChannels} channels, folded to stereo (a guess)` : null].filter(Boolean).join(' · ') || undefined,
          } satisfies Room;
        } catch {
          return null;
        }
      }),
    ).then((loaded) => {
      if (!cancelled) setRooms([DRY, ...loaded.filter((r): r is NonNullable<typeof r> => !!r)]);
    });
    return () => {
      cancelled = true;
    };
  }, [getPlayer]);

  // Switch room (and rebuild when the tail length changes).
  useEffect(() => {
    getPlayer().applyRoom(irFor(active, s.tail), s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, s.tail]);

  // Live parameter changes.
  useEffect(() => {
    getPlayer().updateParams(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.amount, s.preDelay, s.lowCut, s.highCut]);

  // Loudness match, worked out offline from a short excerpt.
  useEffect(() => {
    if (!source) return;
    let stale = false;
    const t = setTimeout(async () => {
      const g = await makeupGain(source.buffer, irFor(active, s.tail), s);
      if (stale) return;
      setMakeup(g);
      getPlayer().setMakeup(matched ? g : 1);
    }, 250);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [source, active, s, matched, irFor, getPlayer]);

  // Playhead.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      setPos(getPlayer().position());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, getPlayer]);

  const loadAudio = useCallback(
    async (name: string, data: ArrayBuffer) => {
      setStatus(`Opening ${name}…`);
      try {
        const p = getPlayer();
        const buffer = await p.ctx.decodeAudioData(data);
        p.setSource(buffer);
        setSource({ name, buffer });
        setPlaying(false);
        setPos(0);
        setDownload(null);
        setStatus('');
      } catch {
        setStatus(`Couldn't read ${name}. Try a WAV, MP3, M4A or FLAC file.`);
      }
    },
    [getPlayer],
  );

  const loadSample = async (file: string, label: string) => {
    const res = await fetch(file);
    if (!res.ok) return setStatus(`The ${label.toLowerCase()} is missing from public${file}.`);
    await loadAudio(label, await res.arrayBuffer());
  };

  const addRoomFile = async (file: File) => {
    try {
      const raw = await getPlayer().ctx.decodeAudioData(await file.arrayBuffer());
      const id = `own-${file.name}-${Date.now()}`;
      const label = file.name.replace(/\.[^.]+$/, '');
      setRooms((rs) => [
        ...rs,
        {
          id,
          label,
          raw,
          defaults: { ...DEFAULT_SETTINGS, tail: Math.min(8, Math.ceil(raw.duration * 10) / 10) },
          note: `Yours · ${raw.numberOfChannels >= 4 ? `${raw.numberOfChannels} channels, folded to stereo` : `${raw.numberOfChannels} ch`}`,
        },
      ]);
      setActiveId(id);
    } catch {
      setStatus(`Couldn't read ${file.name} as an impulse response.`);
    }
  };

  const togglePlay = useCallback(async () => {
    const p = getPlayer();
    if (!p.buffer) return;
    if (p.playing) {
      p.pause();
      setPlaying(false);
    } else {
      await p.play();
      setPlaying(true);
    }
  }, [getPlayer]);

  // Keys: space plays/pauses, 0–9 pick a room.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === 'INPUT' && (el as HTMLInputElement).type !== 'range') return;
      if (e.code === 'Space') {
        e.preventDefault();
        void togglePlay();
      } else if (/^[0-9]$/.test(e.key)) {
        const r = rooms[+e.key];
        if (r) setActiveId(r.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rooms, togglePlay]);

  const update = (patch: Partial<RoomSettings>) => setSettings((all) => ({ ...all, [activeId]: { ...s, ...patch } }));

  const render = async () => {
    if (!source) return;
    setStatus('Rendering…');
    setDownload(null);
    const ir = irFor(active, s.tail);
    const out = await renderRoom(source.buffer, ir, s, { tail: s.tail + s.preDelay + 0.2 });
    const g = matched ? await makeupGain(source.buffer, ir, s) : 1;
    const { buffer, limited } = finish(out, g);
    const url = URL.createObjectURL(toWav(buffer));
    const base = source.name.replace(/\.[^.]+$/, '');
    setDownload({
      url,
      name: `${base} – ${active.label}${ir ? ` ${Math.round(s.amount * 100)}%` : ''}.wav`,
      note: `${fmt(buffer.duration)} · 24-bit WAV${limited < 1 ? ` · turned down ${db(limited).replace('-', '')} to stop it clipping` : ''}`,
    });
    setStatus('');
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) void f.arrayBuffer().then((d) => loadAudio(f.name, d));
  };

  const duration = source?.buffer.duration ?? 0;

  return (
    <main className="min-h-screen bg-cream px-4 py-10 text-ink sm:px-8">
      <div className="mx-auto grid max-w-5xl gap-8">
        <header className="grid gap-2">
          <p className="text-xs tracking-[0.18em] text-muted uppercase">Dev tool · runs in your browser</p>
          <h1 className="text-4xl">Room sound</h1>
          <p className="max-w-2xl text-muted">
            Put a recording in a real room. Switch rooms while it plays (keys 0–9, space to play or pause). Rooms are loudness matched, so you hear the
            room, not a volume change.
          </p>
        </header>

        {/* Source */}
        <section
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`grid gap-4 rounded-2xl border-2 border-dashed p-5 transition ${dragging ? 'border-pine bg-paper' : 'border-line bg-paper/60'}`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer rounded-full bg-pine px-4 py-2 text-sm font-medium text-white hover:bg-pine-dark">
              Upload audio
              <input
                id="audio-file"
                type="file"
                accept="audio/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void f.arrayBuffer().then((d) => loadAudio(f.name, d));
                  e.target.value = '';
                }}
              />
            </label>
            {SAMPLES.map((x) => (
              <button
                key={x.file}
                type="button"
                onClick={() => void loadSample(x.file, x.label)}
                className="rounded-full border border-line bg-paper px-4 py-2 text-sm hover:border-pine"
              >
                {x.label}
              </button>
            ))}
            <span className="text-sm text-muted">or drop a file here</span>
          </div>

          {source ? (
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void togglePlay()}
                  className="w-24 rounded-full bg-ink px-4 py-2 text-sm font-medium text-cream"
                >
                  {playing ? 'Pause' : 'Play'}
                </button>
                <span className="min-w-0 truncate font-medium">{source.name}</span>
                <span className="ml-auto text-sm tabular-nums text-muted">
                  {fmt(pos)} / {fmt(duration)}
                </span>
              </div>
              <input
                id="seek"
                aria-label="Position"
                type="range"
                min={0}
                max={duration}
                step={0.01}
                value={pos}
                onChange={(e) => {
                  setPos(+e.target.value);
                  getPlayer().seek(+e.target.value);
                }}
                className="w-full accent-ink"
              />
              <div className="flex flex-wrap gap-5 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    id="loop"
                    type="checkbox"
                    checked={loop}
                    onChange={(e) => {
                      setLoop(e.target.checked);
                      const p = getPlayer();
                      p.loop = e.target.checked;
                      if (p.playing) void p.play(p.position());
                    }}
                  />
                  Loop
                </label>
                <label className="flex items-center gap-2">
                  <input id="matched" type="checkbox" checked={matched} onChange={(e) => setMatched(e.target.checked)} />
                  Match loudness {matched && activeId !== 'dry' && <span className="tabular-nums text-muted">({db(makeup)})</span>}
                </label>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">Nothing loaded yet. Try the speech sample to start.</p>
          )}
          {status && <p className="text-sm text-ember">{status}</p>}
        </section>

        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          {/* Rooms */}
          <section className="grid content-start gap-3">
            <h2 className="text-2xl">Rooms</h2>
            <ul className="grid gap-2">
              {rooms.map((r, i) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(r.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                      r.id === activeId ? 'border-pine bg-pine text-white' : 'border-line bg-paper hover:border-pine'
                    }`}
                  >
                    <kbd className={`grid h-6 w-6 shrink-0 place-items-center rounded text-xs ${r.id === activeId ? 'bg-white/20' : 'bg-cream'}`}>
                      {i < 10 ? i : ''}
                    </kbd>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{r.label}</span>
                      {(r.raw || r.note) && (
                        <span className={`block text-xs ${r.id === activeId ? 'text-white/75' : 'text-muted'}`}>
                          {r.raw ? `${r.raw.duration.toFixed(1)} s tail` : ''}
                          {r.note ? ` · ${r.note}` : ''}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <label className="cursor-pointer text-sm text-pine underline-offset-2 hover:underline">
              + Add your own room (an impulse response WAV)
              <input
                id="ir-file"
                type="file"
                accept="audio/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void addRoomFile(f);
                  e.target.value = '';
                }}
              />
            </label>
          </section>

          {/* Settings */}
          <section className="grid content-start gap-5 rounded-2xl border border-line bg-paper p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-2xl">{active.label}</h2>
              {active.raw && (
                <button
                  type="button"
                  onClick={() => setSettings((all) => ({ ...all, [activeId]: active.defaults }))}
                  className="text-sm text-muted underline-offset-2 hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
            {active.raw ? (
              <>
                <Slider
                  id="amount"
                  label="Room amount"
                  value={s.amount}
                  min={0}
                  max={1}
                  step={0.01}
                  show={`${Math.round(s.amount * 100)}%`}
                  hint="Speech: 10–25% to sound like a real room. Music: up to 40%."
                  onChange={(v) => update({ amount: v })}
                />
                <Slider
                  id="pre-delay"
                  label="Pre-delay"
                  value={s.preDelay}
                  min={0}
                  max={0.1}
                  step={0.001}
                  show={`${Math.round(s.preDelay * 1000)} ms`}
                  hint="A gap before the room answers. Keeps words clear; bigger rooms want more."
                  onChange={(v) => update({ preDelay: v })}
                />
                <Slider
                  id="high-cut"
                  label="Room high cut"
                  value={Math.log2(s.highCut)}
                  min={Math.log2(1500)}
                  max={Math.log2(18000)}
                  step={0.01}
                  show={`${(s.highCut / 1000).toFixed(1)} kHz`}
                  hint="Lower makes the room softer and further away, like carpet and curtains."
                  onChange={(v) => update({ highCut: Math.round(2 ** v) })}
                />
                <Slider
                  id="low-cut"
                  label="Room low cut"
                  value={Math.log2(s.lowCut)}
                  min={Math.log2(20)}
                  max={Math.log2(600)}
                  step={0.01}
                  show={`${Math.round(s.lowCut)} Hz`}
                  hint="Higher takes boom and mud out of the room."
                  onChange={(v) => update({ lowCut: Math.round(2 ** v) })}
                />
                <Slider
                  id="tail"
                  label="Tail length"
                  value={s.tail}
                  min={0.2}
                  max={Math.max(0.2, Math.ceil(active.raw.duration * 10) / 10)}
                  step={0.1}
                  show={`${s.tail.toFixed(1)} s`}
                  hint="Shortens the room by fading the impulse response out sooner."
                  onChange={(v) => update({ tail: v })}
                />
              </>
            ) : (
              <p className="text-sm text-muted">The recording as it is. Press 0 any time to compare against it.</p>
            )}

            <div className="grid gap-2 border-t border-line pt-5">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={!source}
                  onClick={() => void render()}
                  className="rounded-full bg-ember px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                  Render WAV
                </button>
                {download && (
                  <a href={download.url} download={download.name} className="text-sm font-medium text-pine underline underline-offset-2">
                    Download {download.name}
                  </a>
                )}
              </div>
              <p className="text-xs text-muted">
                {download?.note ?? 'The whole recording with these settings, the room left to ring out at the end, peaks kept under −1 dB.'}
              </p>
            </div>
          </section>
        </div>

        <p className="text-xs text-muted">

          Modelled rooms are made by scripts/make-room-irs.mjs (a box of real size, its walls, how fast each frequency dies away), so they&apos;re ours to use.
          The recorded ones are roughclip&apos;s OpenAIR files, licences not yet checked. Add a real recording of a room with “Add your own room”.
        </p>
      </div>
    </main>
  );
}
