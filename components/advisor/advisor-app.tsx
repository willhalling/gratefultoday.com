'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { firestoreAuth } from '@/firebase/firebase-config';
import type { Entry, Mode, Passage, SavedPassage as Saved, ShortScript, YouTubeScript } from '@/lib/advisor/types';
import { quickSuggestions, SUGGESTION_GROUPS, VIDEO_GROUPS, type Suggestion } from './suggestions';

// ---------------------------------------------------------------------------
// Types and API

interface Voice {
  id: string;
  label: string;
  description: string;
}
interface Pending {
  entry: string;
  voice: string;
  mode: Mode;
  /** Passages found by meaning, before writing starts (fast path). */
  found: number | null;
  /** Keyword searches the advisor ran (fallback path). */
  searches: string[][];
  /** The opening, as it's being written. */
  opening: string;
}

type ProgressEvent = { type: 'retrieved'; found: number } | { type: 'search'; queries: string[] } | { type: 'opening'; text: string };

type Tab = 'journal' | 'saved' | 'memory';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await firestoreAuth.currentUser?.getIdToken();
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, { ...init, headers: { ...(await authHeaders()), ...init.headers } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body as T;
}

/** Sends an entry and reads the streamed progress (newline-delimited JSON). */
async function askAdvisor(
  entry: string,
  voice: string,
  mode: Mode,
  onProgress: (event: ProgressEvent) => void,
): Promise<{ entry: Entry; notes?: string[] }> {
  const res = await fetch('/api/advisor', { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ entry, voice, mode }) });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      if (event.type === 'error') throw new Error(event.message);
      else if (event.type === 'done') return event;
      else onProgress(event);
    }
    if (done) throw new Error('The connection closed before the reply arrived. Please try again.');
  }
}

// Per-device conveniences only; everything that matters lives on the server.
const store = {
  get(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      if (value) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch {}
  },
};
const VOICE_KEY = 'advisor.voice';
const MODE_KEY = 'advisor.mode';

/** The modes, as the switch above the composer shows them. */
const MODES: { id: Mode; label: string; placeholder: string }[] = [
  { id: 'reflect', label: 'Reflect', placeholder: 'What’s on your mind?' },
  { id: 'short', label: 'TikTok / Shorts', placeholder: 'Topic for a short video…' },
  { id: 'youtube', label: 'YouTube', placeholder: 'Topic for a YouTube video…' },
];
const isMode = (m: string | null): m is Mode => MODES.some((x) => x.id === m);
const DRAFT_KEY = 'advisor.draft';

// ---------------------------------------------------------------------------
// App

export default function AdvisorApp() {
  const [tab, setTab] = useState<Tab>('journal');
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voice, setVoice] = useState('advisor');
  const [mode, setMode] = useState<Mode>('reflect');
  const [entries, setEntries] = useState<Entry[]>([]); // oldest first
  const [notes, setNotes] = useState<string[]>([]);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [voiceSheet, setVoiceSheet] = useState(false);
  const [browse, setBrowse] = useState(false);

  const scroller = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(store.get(DRAFT_KEY) ?? '');
    const storedMode = store.get(MODE_KEY);
    if (isMode(storedMode)) setMode(storedMode);
    api<{ voices: Voice[]; defaultVoice: string; entries: Entry[]; notes: string[]; saved: Saved[] }>('/api/advisor')
      .then((d) => {
        setVoices(d.voices);
        const stored = store.get(VOICE_KEY);
        setVoice(stored && d.voices.some((v) => v.id === stored) ? stored : d.defaultVoice);
        setEntries(d.entries.slice().reverse());
        setNotes(d.notes);
        setSaved(d.saved);
      })
      .catch((e) => setProblem(e.message))
      .finally(() => setLoaded(true));
  }, []);

  const scrollToEnd = useCallback((smooth = true) => {
    requestAnimationFrame(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }));
  }, []);

  // Land at the newest entry when the journal opens.
  useLayoutEffect(() => {
    if (loaded && tab === 'journal' && entries.length) scrollToEnd(false);
    else scroller.current?.scrollTo({ top: 0 });
    // Only on opening the journal; new entries scroll themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, tab, scrollToEnd]);

  const chooseVoice = (id: string) => {
    setVoice(id);
    store.set(VOICE_KEY, id);
  };

  const chooseMode = (m: Mode) => {
    setMode(m);
    store.set(MODE_KEY, m);
  };

  const updateDraft = (text: string) => {
    setDraft(text);
    store.set(DRAFT_KEY, text);
  };

  const useSuggestion = (s: Suggestion) => {
    if (s.voice && voices.some((v) => v.id === s.voice)) chooseVoice(s.voice);
    chooseMode(s.mode ?? 'reflect');
    updateDraft(s.text);
    setBrowse(false);
    setTab('journal');
    requestAnimationFrame(() => {
      const el = composer.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(s.text.length, s.text.length);
    });
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || pending) return;
    setProblem(null);
    setPending({ entry: text, voice, mode, found: null, searches: [], opening: '' });
    updateDraft('');
    composer.current?.blur();
    scrollToEnd();
    try {
      let started = false;
      const r = await askAdvisor(text, voice, mode, (event) => {
        setPending((p) => {
          if (!p) return p;
          if (event.type === 'retrieved') return { ...p, found: event.found };
          if (event.type === 'search') return { ...p, searches: [...p.searches, event.queries] };
          return { ...p, opening: event.text };
        });
        // Follow the reply down as it arrives, once, rather than on every word.
        if (event.type !== 'opening' || !started) scrollToEnd();
        if (event.type === 'opening') started = true;
      });
      setEntries((e) => [...e, r.entry]);
      if (r.notes) setNotes(r.notes);
      scrollToEnd();
    } catch (e) {
      setProblem((e as Error).message);
      updateDraft(text); // give the words back so nothing is lost
    } finally {
      setPending(null);
    }
  };

  const isSaved = useCallback((id: string) => saved.some((s) => s.chunkId === id), [saved]);

  const savePassage = async (p: Passage, note = '') => {
    try {
      const s = await api<Saved>('/api/advisor/saved', {
        method: 'POST',
        body: JSON.stringify({ chunkId: p.chunkId, quote: p.quote, why: p.why, note }),
      });
      setSaved((list) => {
        const i = list.findIndex((x) => x.chunkId === s.chunkId);
        return i === -1 ? [s, ...list] : list.map((x, j) => (j === i ? s : x));
      });
    } catch (e) {
      setProblem((e as Error).message);
    }
  };

  const unsavePassage = async (p: Passage) => {
    try {
      await api(`/api/advisor/saved?chunkId=${encodeURIComponent(p.chunkId)}`, { method: 'DELETE' });
      setSaved((s) => s.filter((x) => x.chunkId !== p.chunkId));
    } catch (e) {
      setProblem((e as Error).message);
    }
  };

  const toggleSave = (p: Passage) => (isSaved(p.chunkId) ? unsavePassage(p) : savePassage(p));

  const saveNotes = async (next: string[]) => {
    try {
      const r = await api<{ notes: string[] }>('/api/advisor/memory', { method: 'PUT', body: JSON.stringify({ notes: next }) });
      setNotes(r.notes);
    } catch (e) {
      setProblem((e as Error).message);
    }
  };

  const currentVoice = voices.find((v) => v.id === voice);
  const voiceLabel = (id: string) => voices.find((v) => v.id === id)?.label ?? id;
  const empty = loaded && !entries.length && !pending;

  return (
    <div className="fixed inset-0 flex justify-center bg-cream">
      <div className="relative flex h-full w-full max-w-2xl flex-col bg-paper sm:border-x sm:border-line">
        {/* Top bar */}
        <header className="z-10 shrink-0 border-b border-line/70 bg-paper/90 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="flex h-14 items-center justify-between px-4">
            <h1 className="font-serif text-2xl font-semibold text-pine">
              {tab === 'journal' ? 'Advisor' : tab === 'saved' ? 'Saved' : 'Memory'}
            </h1>
            {tab === 'journal' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBrowse(true)}
                  className="flex h-9 items-center gap-1 rounded-full px-2.5 text-sm text-pine active:bg-cream"
                  aria-label="Ideas for what to ask"
                >
                  <IdeaIcon />
                  <span>Ideas</span>
                </button>
                <button
                  onClick={() => setVoiceSheet(true)}
                  className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-cream/60 pl-3 pr-2.5 text-sm text-ink active:bg-cream"
                >
                  <span className="max-w-40 truncate">
                    {mode === 'reflect'
                      ? currentVoice?.label ?? 'Voice'
                      : `From: ${!currentVoice || currentVoice.id === 'advisor' ? 'all writers' : currentVoice.label}`}
                  </span>
                  <ChevronIcon />
                </button>
              </div>
            )}
          </div>
        </header>

        {problem && (
          <div className="absolute inset-x-3 top-[calc(env(safe-area-inset-top)+4rem)] z-20 flex items-start gap-3 rounded-xl border border-ember/30 bg-paper px-4 py-3 text-sm text-ember shadow-lg">
            <span className="flex-1">{problem}</span>
            <button onClick={() => setProblem(null)} aria-label="Dismiss" className="text-lg leading-none">
              ×
            </button>
          </div>
        )}

        {/* Content */}
        <div ref={scroller} className="flex-1 overflow-y-auto overscroll-contain">
          {!loaded && <p className="mt-24 animate-pulse text-center font-serif italic text-muted">Opening your journal…</p>}

          {tab === 'journal' && loaded && (
            <div className="px-4 pb-6 pt-4">
              {empty ? (
                <Welcome onPick={useSuggestion} />
              ) : (
                <Thread
                  entries={entries}
                  pending={pending}
                  voiceLabel={voiceLabel}
                  isSaved={isSaved}
                  onToggleSave={toggleSave}
                />
              )}
            </div>
          )}

          {tab === 'saved' && loaded && (
            <SavedList saved={saved} onRemove={unsavePassage} onNote={savePassage} onGoToJournal={() => setTab('journal')} />
          )}

          {tab === 'memory' && loaded && <Memory notes={notes} onChange={saveNotes} />}
        </div>

        {/* Composer */}
        {tab === 'journal' && (
          <Composer
            ref={composer}
            draft={draft}
            onDraft={updateDraft}
            onSend={send}
            busy={!!pending}
            showQuick={!draft && (!empty || mode !== 'reflect') && !pending}
            onPick={useSuggestion}
            onMore={() => setBrowse(true)}
            mode={mode}
            onMode={chooseMode}
            placeholder={
              mode === 'reflect' && currentVoice && currentVoice.id !== 'advisor'
                ? `Write to ${currentVoice.label}…`
                : MODES.find((m) => m.id === mode)!.placeholder
            }
          />
        )}

        {/* Tab bar */}
        <nav className="shrink-0 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)]">
          <div className="grid h-14 grid-cols-3">
            <TabButton active={tab === 'journal'} onClick={() => setTab('journal')} label="Journal" icon={<JournalIcon />} />
            <TabButton
              active={tab === 'saved'}
              onClick={() => setTab('saved')}
              label="Saved"
              icon={<BookmarkIcon filled={tab === 'saved'} />}
              badge={saved.length || undefined}
            />
            <TabButton active={tab === 'memory'} onClick={() => setTab('memory')} label="Memory" icon={<MemoryIcon />} />
          </div>
        </nav>

        {voiceSheet && (
          <Sheet title={mode === 'reflect' ? 'Choose a voice' : 'Quote from…'} onClose={() => setVoiceSheet(false)}>
            <ul className="divide-y divide-line">
              {voices.map((v) => (
                <li key={v.id}>
                  <button
                    onClick={() => {
                      chooseVoice(v.id);
                      setVoiceSheet(false);
                    }}
                    className="flex w-full items-start gap-3 px-5 py-3.5 text-left active:bg-cream"
                  >
                    <span className="flex-1">
                      <span className="block font-medium text-ink">{v.label}</span>
                      <span className="block text-sm text-muted">{v.description}</span>
                    </span>
                    {v.id === voice && <span className="mt-0.5 text-pine">✓</span>}
                  </button>
                </li>
              ))}
            </ul>
          </Sheet>
        )}

        {browse && (
          <Sheet title="Things you can ask" onClose={() => setBrowse(false)}>
            <div className="px-5 pb-4">
              <SuggestionGroups groups={mode === 'reflect' ? [...SUGGESTION_GROUPS, ...VIDEO_GROUPS] : [...VIDEO_GROUPS, ...SUGGESTION_GROUPS]} onPick={useSuggestion} />
            </div>
          </Sheet>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Journal

function Welcome({ onPick }: { onPick: (s: Suggestion) => void }) {
  return (
    <div className="pb-4 pt-6">
      <h2 className="font-serif text-3xl font-semibold leading-tight text-ink">What’s on your mind?</h2>
      <p className="mt-3 leading-relaxed text-muted">
        Write the way you would in a journal. Your advisor answers with a few words of its own and a passage or two
        from Marcus Aurelius, Seneca, Emerson, the Tao Te Ching and more. Every quote is real and cited.
      </p>
      <ul className="mt-5 space-y-2 text-sm text-muted">
        <li className="flex gap-2">
          <span className="text-gold">✦</span> It remembers what you tell it, so you don’t have to repeat yourself.
        </li>
        <li className="flex gap-2">
          <span className="text-gold">✦</span> Tap the voice at the top to hear from a single writer instead.
        </li>
        <li className="flex gap-2">
          <span className="text-gold">✦</span> Tap the bookmark on any quote to keep it in Saved.
        </li>
        <li className="flex gap-2">
          <span className="text-gold">✦</span> Making videos? Switch to TikTok / Shorts or YouTube above the box below,
          and it writes a script with hooks around a real quote.
        </li>
      </ul>
      <p className="mb-3 mt-8 text-xs font-medium uppercase tracking-wider text-muted">Try one of these</p>
      <SuggestionGroups groups={[...SUGGESTION_GROUPS, ...VIDEO_GROUPS]} onPick={onPick} />
    </div>
  );
}

function SuggestionGroups({ groups, onPick }: { groups: typeof SUGGESTION_GROUPS; onPick: (s: Suggestion) => void }) {
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.title}>
          <h3 className="font-serif text-lg font-semibold text-pine">{g.title}</h3>
          <p className="mb-2.5 text-sm text-muted">{g.hint}</p>
          <div className="flex flex-wrap gap-2">
            {g.items.map((s) => (
              <Chip key={s.label} suggestion={s} onPick={onPick} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Chip({ suggestion: s, onPick }: { suggestion: Suggestion; onPick: (s: Suggestion) => void }) {
  return (
    <button
      onClick={() => onPick(s)}
      className="shrink-0 rounded-full border border-line bg-paper px-3.5 py-2 text-sm text-ink shadow-sm transition-colors active:bg-cream sm:hover:border-pine"
    >
      {s.label}
    </button>
  );
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function Thread({
  entries,
  pending,
  voiceLabel,
  isSaved,
  onToggleSave,
}: {
  entries: Entry[];
  pending: Pending | null;
  voiceLabel: (id: string) => string;
  isSaved: (id: string) => boolean;
  onToggleSave: (p: Passage) => void;
}) {
  let lastDay = '';
  return (
    <div className="space-y-8">
      {entries.map((e) => {
        const day = dayLabel(e.createdAt);
        const showDay = day !== lastDay;
        lastDay = day;
        return (
          <div key={e.id} className="space-y-5">
            {showDay && <DaySeparator label={day} />}
            <YourEntry text={e.entry} mode={e.mode ?? 'reflect'} />
            {e.reply && <Reply entry={e} voiceLabel={voiceLabel(e.voice)} isSaved={isSaved} onToggleSave={onToggleSave} />}
            {e.script?.kind === 'short' && <ShortScriptView script={e.script} isSaved={isSaved} onToggleSave={onToggleSave} />}
            {e.script?.kind === 'youtube' && <YouTubeScriptView script={e.script} isSaved={isSaved} onToggleSave={onToggleSave} />}
          </div>
        );
      })}
      {pending && (
        <div className="space-y-5">
          {lastDay !== 'Today' && <DaySeparator label="Today" />}
          <YourEntry text={pending.entry} mode={pending.mode} />
          <Thinking voiceLabel={voiceLabel(pending.voice)} pending={pending} />
        </div>
      )}
    </div>
  );
}

function DaySeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2 text-xs font-medium uppercase tracking-wider text-muted">
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function YourEntry({ text, mode }: { text: string; mode: Mode }) {
  return (
    <div className="flex flex-col items-end gap-1">
      {mode !== 'reflect' && (
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
          {mode === 'short' ? 'Short video script' : 'YouTube script'}
        </span>
      )}
      <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-pine px-4 py-3 text-[15px] leading-relaxed text-paper">
        {text}
      </p>
    </div>
  );
}

function Reply({
  entry,
  voiceLabel,
  isSaved,
  onToggleSave,
}: {
  entry: Entry;
  voiceLabel: string;
  isSaved: (id: string) => boolean;
  onToggleSave: (p: Passage) => void;
}) {
  const { opening, passages, closing } = entry.reply!;
  return (
    <div className="space-y-4">
      <p className="text-xs font-medium uppercase tracking-wider text-gold">{voiceLabel}</p>
      <p className="whitespace-pre-wrap font-serif text-[17px] leading-relaxed text-ink">{opening}</p>
      {passages.map((p) => (
        <PassageCard key={p.chunkId} passage={p} saved={isSaved(p.chunkId)} onToggleSave={() => onToggleSave(p)} />
      ))}
      {closing && (
        <p className="border-l-2 border-gold pl-3 font-serif text-[17px] italic leading-relaxed text-pine">{closing}</p>
      )}
    </div>
  );
}

function Thinking({ voiceLabel, pending }: { voiceLabel: string; pending: Pending }) {
  const { found, searches, opening, mode } = pending;
  if (mode !== 'reflect') {
    return (
      <div className="rounded-2xl border border-line bg-cream/50 px-4 py-3.5 text-sm text-muted">
        <ul className="space-y-2">
          {found !== null && (
            <li className="flex gap-2">
              <span className="text-pine">✓</span>
              <span>Found {found} passages to build it around</span>
            </li>
          )}
          {opening && (
            <li className="flex gap-2">
              <span className="text-pine">✓</span>
              <span>
                {mode === 'short' ? 'Working title: ' : 'Hook: '}
                <span className="italic text-ink">{opening}</span>
              </span>
            </li>
          )}
          <li className="flex items-center gap-2">
            <Dots />
            <span>{mode === 'short' ? 'Writing hooks, beats and caption…' : 'Writing the script, titles and chapters… (about a minute)'}</span>
          </li>
        </ul>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-xs font-medium uppercase tracking-wider text-gold">{voiceLabel}</p>
      {opening ? (
        <>
          <p className="whitespace-pre-wrap font-serif text-[17px] leading-relaxed text-ink">
            {opening}
            <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-pine/60" aria-hidden />
          </p>
          <p className="flex items-center gap-2 text-sm text-muted">
            <Dots /> Choosing the passages…
          </p>
        </>
      ) : (
        <div className="rounded-2xl border border-line bg-cream/50 px-4 py-3.5 text-sm text-muted">
          <ul className="space-y-2">
            {found !== null && (
              <li className="flex gap-2">
                <span className="text-pine">✓</span>
                <span>Found {found} passages that might speak to this</span>
              </li>
            )}
            {searches.map((q, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-pine">✓</span>
                <span>
                  Searched the library for <span className="italic text-ink">{q.join(' · ')}</span>
                </span>
              </li>
            ))}
            <li className="flex items-center gap-2">
              <Dots />
              <span>{found !== null || searches.length ? 'Reading them and writing…' : 'Looking through the library…'}</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

function Dots() {
  return (
    <span className="flex gap-1" aria-hidden>
      {[0, 150, 300].map((d) => (
        <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-pine/60" style={{ animationDelay: `${d}ms` }} />
      ))}
    </span>
  );
}

function citation(p: Passage) {
  return [p.work, p.location].filter(Boolean).join(', ') + (p.translator ? ` · trans. ${p.translator}` : '');
}

function PassageCard({ passage: p, saved, onToggleSave }: { passage: Passage; saved: boolean; onToggleSave: () => void }) {
  return (
    <figure className="rounded-2xl border border-line bg-cream/60 px-5 py-4">
      <blockquote className="whitespace-pre-wrap font-serif text-[17px] italic leading-relaxed text-ink">
        “{p.quote}”
      </blockquote>
      <figcaption className="mt-3 flex items-end justify-between gap-3">
        <span className="text-sm">
          <span className="block font-medium text-ink">{p.author}</span>
          <span className="block text-xs leading-snug text-muted">{citation(p)}</span>
        </span>
        <button
          onClick={onToggleSave}
          className={`-mb-1 -mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full active:bg-cream ${
            saved ? 'text-gold' : 'text-muted'
          }`}
          aria-label={saved ? 'Remove from saved' : 'Save this passage'}
        >
          <BookmarkIcon filled={saved} />
        </button>
      </figcaption>
      {p.why && <p className="mt-3 border-t border-line pt-3 text-sm leading-relaxed text-muted">{p.why}</p>}
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Video scripts

function cite(p: Passage) {
  return `${p.author}, ${p.work}${p.location ? `, ${p.location}` : ''}${p.translator ? ` (trans. ${p.translator})` : ''}`;
}

/** The whole script as plain text, for pasting into notes or a teleprompter. */
function scriptToText(s: ShortScript | YouTubeScript): string {
  const sources = s.passages.length ? `\n\nSOURCES\n${s.passages.map((p) => `“${p.quote}” — ${cite(p)}`).join('\n')}` : '';
  if (s.kind === 'short') {
    return [
      s.title.toUpperCase(),
      `HOOKS TO TEST\n${s.hooks.map((h, i) => `${i + 1}. ${h.text}  (${h.style})`).join('\n')}`,
      `SCRIPT\n${s.beats.map((b, i) => `${i + 1}. ${b.voiceover}\n   On screen: ${b.onScreen}\n   Visual: ${b.visual}`).join('\n')}`,
      `CTA\n${s.cta}`,
      `CAPTION\n${s.caption}\n\n${s.hashtags.map((h) => `#${h}`).join(' ')}`,
    ].join('\n\n') + sources;
  }
  return [
    `TITLE OPTIONS\n${s.titles.map((t) => `- ${t}`).join('\n')}`,
    `THUMBNAIL TEXT\n${s.thumbnailText.map((t) => `- ${t}`).join('\n')}`,
    `HOOK\n${s.hook}`,
    ...s.sections.map((x) => `${x.heading.toUpperCase()}\n${x.voiceover}\n[On screen: ${x.onScreen}]`),
    `OUTRO\n${s.outro}`,
    `DESCRIPTION\n${s.description}\n\n${s.chapters.map((c) => `${c.time} ${c.title}`).join('\n')}`,
    `TAGS\n${s.tags.join(', ')}`,
  ].join('\n\n') + sources;
}

function CopyButton({ text, label = 'Copy', className = '' }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
      className={`shrink-0 rounded-full border border-line px-3 py-1 text-xs font-medium text-pine active:bg-cream ${className}`}
    >
      {copied ? 'Copied ✓' : label}
    </button>
  );
}

function ScriptSection({ title, copy, children }: { title: string; copy?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line px-4 py-4 first:border-t-0">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h4 className="text-xs font-medium uppercase tracking-wider text-gold">{title}</h4>
        {copy && <CopyButton text={copy} />}
      </div>
      {children}
    </section>
  );
}

interface ScriptViewProps {
  isSaved: (id: string) => boolean;
  onToggleSave: (p: Passage) => void;
}

function ScriptHeader({ kind, title, text }: { kind: 'short' | 'youtube'; title: string; text: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line bg-cream/60 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
          {kind === 'short' ? 'TikTok · Reels · Shorts' : 'YouTube'}
        </p>
        <h3 className="mt-0.5 font-serif text-xl font-semibold leading-snug text-ink">{title}</h3>
      </div>
      <CopyButton text={text} label="Copy all" className="mt-1 bg-paper" />
    </div>
  );
}

function SourcePassages({ passages, isSaved, onToggleSave }: { passages: Passage[] } & ScriptViewProps) {
  if (!passages.length) return null;
  return (
    <ScriptSection title="Quotes used (verified)">
      <div className="space-y-3">
        {passages.map((p) => (
          <PassageCard key={p.chunkId} passage={p} saved={isSaved(p.chunkId)} onToggleSave={() => onToggleSave(p)} />
        ))}
      </div>
    </ScriptSection>
  );
}

function ShortScriptView({ script: s, ...save }: { script: ShortScript } & ScriptViewProps) {
  const words = s.beats.reduce((n, b) => n + b.voiceover.split(/\s+/).filter(Boolean).length, 0);
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
      <ScriptHeader kind="short" title={s.title} text={scriptToText(s)} />
      <ScriptSection title="Hooks to test">
        <ol className="space-y-2">
          {s.hooks.map((h, i) => (
            <li key={i} className="flex items-start gap-3 rounded-xl bg-cream/50 px-3 py-2.5">
              <span className="flex-1">
                <span className="block font-serif text-[17px] leading-snug text-ink">{h.text}</span>
                <span className="mt-0.5 block text-xs text-muted">{h.style}</span>
              </span>
              <CopyButton text={h.text} />
            </li>
          ))}
        </ol>
      </ScriptSection>
      <ScriptSection title={`Script · about ${Math.max(15, Math.round(words / 2.5))} seconds`} copy={s.beats.map((b) => b.voiceover).join('\n\n')}>
        <ol className="space-y-4">
          {s.beats.map((b, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pine text-xs font-medium text-paper">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-[15px] leading-relaxed text-ink">{b.voiceover}</p>
                {b.onScreen && (
                  <p className="inline-block rounded-md bg-ink px-2 py-0.5 text-xs font-semibold text-paper">{b.onScreen}</p>
                )}
                {b.visual && <p className="text-xs italic text-muted">🎬 {b.visual}</p>}
              </div>
            </li>
          ))}
        </ol>
      </ScriptSection>
      <ScriptSection title="Call to action" copy={s.cta}>
        <p className="text-[15px] text-ink">{s.cta}</p>
      </ScriptSection>
      <ScriptSection title="Caption & hashtags" copy={`${s.caption}\n\n${s.hashtags.map((h) => `#${h}`).join(' ')}`}>
        <p className="whitespace-pre-wrap text-[15px] text-ink">{s.caption}</p>
        <p className="mt-2 text-sm text-pine">{s.hashtags.map((h) => `#${h}`).join(' ')}</p>
      </ScriptSection>
      <SourcePassages passages={s.passages} {...save} />
    </article>
  );
}

function YouTubeScriptView({ script: s, ...save }: { script: YouTubeScript } & ScriptViewProps) {
  const [open, setOpen] = useState(false);
  const words = [s.hook, ...s.sections.map((x) => x.voiceover), s.outro].join(' ').split(/\s+/).filter(Boolean).length;
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
      <ScriptHeader kind="youtube" title={s.titles[0] ?? 'YouTube script'} text={scriptToText(s)} />
      <ScriptSection title="Title options">
        <ul className="space-y-2">
          {s.titles.map((t, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-1 font-serif text-[17px] leading-snug text-ink">{t}</span>
              <CopyButton text={t} />
            </li>
          ))}
        </ul>
        {s.thumbnailText.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {s.thumbnailText.map((t, i) => (
              <span key={i} className="rounded-md bg-ink px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-gold">
                {t}
              </span>
            ))}
          </div>
        )}
      </ScriptSection>
      <ScriptSection title="Hook · first 30 seconds" copy={s.hook}>
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{s.hook}</p>
      </ScriptSection>
      <ScriptSection title={`Script · about ${Math.round(words / 150)} minutes`}>
        {open ? (
          <div className="space-y-5">
            {s.sections.map((x, i) => (
              <div key={i}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <h5 className="font-serif text-lg font-semibold text-pine">{x.heading}</h5>
                  <CopyButton text={x.voiceover} />
                </div>
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{x.voiceover}</p>
                {x.onScreen && <p className="mt-1.5 text-xs italic text-muted">🎬 On screen: {x.onScreen}</p>}
              </div>
            ))}
            <div>
              <h5 className="mb-1.5 font-serif text-lg font-semibold text-pine">Outro</h5>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{s.outro}</p>
            </div>
          </div>
        ) : (
          <div>
            <ol className="space-y-1 text-[15px] text-ink">
              {s.sections.map((x, i) => (
                <li key={i}>
                  {i + 1}. {x.heading}
                </li>
              ))}
            </ol>
            <button onClick={() => setOpen(true)} className="mt-3 rounded-full bg-pine px-4 py-2 text-sm font-medium text-paper">
              Read full script
            </button>
          </div>
        )}
      </ScriptSection>
      <ScriptSection
        title="Description & chapters"
        copy={`${s.description}\n\n${s.chapters.map((c) => `${c.time} ${c.title}`).join('\n')}`}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{s.description}</p>
        <ul className="mt-3 space-y-0.5 text-sm text-muted">
          {s.chapters.map((c, i) => (
            <li key={i}>
              <span className="font-medium tabular-nums text-pine">{c.time}</span> {c.title}
            </li>
          ))}
        </ul>
      </ScriptSection>
      <ScriptSection title="Tags" copy={s.tags.join(', ')}>
        <p className="text-sm text-muted">{s.tags.join(', ')}</p>
      </ScriptSection>
      <SourcePassages passages={s.passages} {...save} />
    </article>
  );
}

// ---------------------------------------------------------------------------
// Composer

interface ComposerProps {
  draft: string;
  onDraft: (s: string) => void;
  onSend: () => void;
  busy: boolean;
  showQuick: boolean;
  onPick: (s: Suggestion) => void;
  onMore: () => void;
  placeholder: string;
  mode: Mode;
  onMode: (m: Mode) => void;
  ref: React.Ref<HTMLTextAreaElement>;
}

function Composer({ draft, onDraft, onSend, busy, showQuick, onPick, onMore, placeholder, mode, onMode, ref }: ComposerProps) {
  const inner = useRef<HTMLTextAreaElement | null>(null);

  // Grow with the text, up to about six lines.
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [draft]);

  const setRefs = (el: HTMLTextAreaElement | null) => {
    inner.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
  };

  return (
    <div className="shrink-0 border-t border-line/70 bg-paper">
      <div className="flex gap-1 px-3 pt-2.5" role="tablist" aria-label="What to write">
        {MODES.map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={mode === m.id}
            disabled={busy}
            onClick={() => onMode(m.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === m.id ? 'bg-pine text-paper' : 'text-muted active:bg-cream'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {showQuick && (
        <div className="flex gap-2 overflow-x-auto px-4 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {quickSuggestions(mode).map((s) => (
            <Chip key={s.label} suggestion={s} onPick={onPick} />
          ))}
          <button onClick={onMore} className="shrink-0 rounded-full px-3 py-2 text-sm font-medium text-pine">
            More…
          </button>
        </div>
      )}
      <form
        className="flex items-end gap-2 px-3 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
      >
        <textarea
          ref={setRefs}
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSend();
          }}
          rows={1}
          disabled={busy}
          placeholder={busy ? 'Your advisor is replying…' : placeholder}
          enterKeyHint="enter"
          className="max-h-42 min-h-11 flex-1 resize-none rounded-3xl border border-line bg-cream/40 px-4 py-2.5 text-base leading-snug text-ink placeholder:text-muted/70 focus:border-pine/40 focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          aria-label="Send"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pine text-paper transition-opacity active:bg-pine-dark disabled:opacity-30"
        >
          <SendIcon />
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Saved and Memory

interface SavedActions {
  onRemove: (p: Passage) => void;
  onNote: (p: Passage, note: string) => void;
}

function SavedList({ saved, onGoToJournal, ...actions }: { saved: Saved[]; onGoToJournal: () => void } & SavedActions) {
  if (!saved.length) {
    return (
      <EmptyState
        icon={<BookmarkIcon />}
        title="Your commonplace book"
        body="When a passage speaks to you, tap its bookmark and it’s kept here, with room for your own note. Writers have kept books like this for centuries."
        action={{ label: 'Go to journal', onClick: onGoToJournal }}
      />
    );
  }
  return (
    <div className="space-y-6 px-4 py-4">
      {saved.map((s) => (
        <SavedCard key={s.chunkId} saved={s} {...actions} />
      ))}
    </div>
  );
}

function SavedCard({ saved: s, onRemove, onNote }: { saved: Saved } & SavedActions) {
  const [note, setNote] = useState(s.note);
  const dirty = note !== s.note;
  return (
    <div>
      <PassageCard passage={s} saved onToggleSave={() => onRemove(s)} />
      <div className="mt-2 flex items-start gap-2">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={1}
          placeholder="Add a note…"
          className="flex-1 resize-y rounded-xl border border-transparent bg-transparent px-3 py-2 text-base text-muted focus:border-line focus:bg-cream/30 focus:outline-none"
        />
        {dirty && (
          <button onClick={() => onNote(s, note)} className="mt-1 rounded-full bg-pine px-4 py-1.5 text-sm text-paper">
            Save
          </button>
        )}
      </div>
    </div>
  );
}

function Memory({ notes, onChange }: { notes: string[]; onChange: (notes: string[]) => void }) {
  const [adding, setAdding] = useState('');
  return (
    <div className="px-4 py-4">
      <p className="mb-5 leading-relaxed text-muted">
        Your advisor keeps these notes so it doesn’t forget you between entries, and updates them as you write. Remove
        anything that’s wrong, or add something it should know, like your name or what you’re working on.
      </p>
      {notes.length ? (
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {notes.map((n, i) => (
            <li key={`${i}-${n}`} className="flex items-start gap-3 py-3 pl-4 pr-2">
              <span className="flex-1 leading-relaxed text-ink">{n}</span>
              <button
                onClick={() => onChange(notes.filter((_, j) => j !== i))}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg text-muted active:bg-cream"
                aria-label="Forget this"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-muted">
          Nothing yet. It starts learning after your first entry.
        </p>
      )}
      <form
        className="mt-5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!adding.trim()) return;
          onChange([...notes, adding.trim()]);
          setAdding('');
        }}
      >
        <input
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          placeholder="Something it should remember…"
          className="min-w-0 flex-1 rounded-full border border-line bg-paper px-4 py-2.5 text-base focus:border-pine/40 focus:outline-none"
        />
        <button className="rounded-full bg-pine px-5 text-sm font-medium text-paper disabled:opacity-40" disabled={!adding.trim()}>
          Add
        </button>
      </form>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center px-8 pt-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-cream text-pine">{icon}</span>
      <h2 className="mt-4 font-serif text-2xl font-semibold text-ink">{title}</h2>
      <p className="mt-2 leading-relaxed text-muted">{body}</p>
      {action && (
        <button onClick={action.onClick} className="mt-6 rounded-full bg-pine px-5 py-2.5 text-sm font-medium text-paper">
          {action.label}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shell pieces

function TabButton({
  active,
  onClick,
  label,
  icon,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active ? 'text-pine' : 'text-muted'}`}
      aria-current={active ? 'page' : undefined}
    >
      <span className="relative">
        {icon}
        {badge ? (
          <span className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-gold px-1 text-center text-[10px] leading-4 text-paper">
            {badge}
          </span>
        ) : null}
      </span>
      {label}
    </button>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end">
      <button
        aria-label="Close"
        onClick={onClose}
        className={`absolute inset-0 bg-ink/30 transition-opacity duration-200 ${shown ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        role="dialog"
        aria-label={title}
        className={`relative max-h-[85%] overflow-y-auto rounded-t-3xl bg-paper pb-[env(safe-area-inset-bottom)] shadow-2xl transition-transform duration-300 ease-out ${
          shown ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="sticky top-0 bg-paper px-5 pb-3 pt-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold text-ink">{title}</h2>
            <button onClick={onClose} className="text-sm font-medium text-pine">
              Done
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons (inline, 24px, stroke = currentColor)

const iconProps = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function JournalIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H19v-5" />
      <path d="M9 8h6M9 11.5h4" />
    </svg>
  );
}
function BookmarkIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg {...iconProps} fill={filled ? 'currentColor' : 'none'}>
      <path d="M6 3.5h12v17l-6-4-6 4z" />
    </svg>
  );
}
function MemoryIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}
function IdeaIcon() {
  return (
    <svg {...iconProps} width={20} height={20}>
      <path d="M12 3a6 6 0 0 0-3.5 10.9V17h7v-3.1A6 6 0 0 0 12 3z" />
      <path d="M9.5 20h5M10.5 22.5h3" />
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg {...iconProps} width={16} height={16}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg {...iconProps} width={20} height={20} strokeWidth={2}>
      <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
    </svg>
  );
}
