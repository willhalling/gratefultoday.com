'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { firestoreAuth } from '@/firebase/firebase-config';

interface Voice {
  id: string;
  label: string;
  description: string;
}
interface Passage {
  chunkId: string;
  quote: string;
  why: string;
  author: string;
  work: string;
  translator: string | null;
  location: string | null;
  source: string;
}
interface Entry {
  id: string;
  entry: string;
  voice: string;
  reply: { opening: string; passages: Passage[]; closing: string };
  createdAt: string;
}
interface Saved extends Passage {
  note: string;
  savedAt: string;
}

type Tab = 'journal' | 'book' | 'memory';

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await firestoreAuth.currentUser?.getIdToken();
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body as T;
}

const VOICE_KEY = 'advisor.voice';

export default function AdvisorApp() {
  const [tab, setTab] = useState<Tab>('journal');
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voice, setVoice] = useState('advisor');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api<{ voices: Voice[]; defaultVoice: string; entries: Entry[]; notes: string[]; saved: Saved[] }>('/api/advisor')
      .then((d) => {
        setVoices(d.voices);
        let stored: string | null = null;
        try {
          stored = localStorage.getItem(VOICE_KEY);
        } catch {}
        setVoice(stored && d.voices.some((v) => v.id === stored) ? stored : d.defaultVoice);
        setEntries(d.entries);
        setNotes(d.notes);
        setSaved(d.saved);
      })
      .catch((e) => setProblem(e.message))
      .finally(() => setLoaded(true));
  }, []);

  const chooseVoice = (id: string) => {
    setVoice(id);
    try {
      localStorage.setItem(VOICE_KEY, id);
    } catch {}
  };

  const ask = async () => {
    if (!draft.trim() || thinking) return;
    setThinking(true);
    setProblem(null);
    try {
      const r = await api<{ entry: Entry; notes: string[] }>('/api/advisor', {
        method: 'POST',
        body: JSON.stringify({ entry: draft, voice }),
      });
      setEntries((e) => [r.entry, ...e]);
      setNotes(r.notes);
      setDraft('');
    } catch (e) {
      setProblem((e as Error).message);
    } finally {
      setThinking(false);
    }
  };

  const isSaved = useCallback((id: string) => saved.some((s) => s.chunkId === id), [saved]);

  /** Saves a passage (or updates its note) in the commonplace book. */
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

  const voiceLabel = (id: string) => voices.find((v) => v.id === id)?.label ?? id;

  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-12 sm:px-6">
        <header className="mb-10">
          <h1 className="text-4xl font-semibold text-pine">Advisor</h1>
          <nav className="mt-6 flex gap-6 border-b border-line text-sm">
            {(
              [
                ['journal', 'Journal'],
                ['book', `Commonplace book${saved.length ? ` (${saved.length})` : ''}`],
                ['memory', 'What it remembers'],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`-mb-px border-b-2 pb-3 transition-colors ${
                  tab === id ? 'border-pine text-pine' : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </header>

        {problem && (
          <p className="mb-6 rounded-lg border border-ember/30 bg-ember/5 px-4 py-3 text-sm text-ember">{problem}</p>
        )}

        {tab === 'journal' && (
          <>
            <section className="rounded-2xl border border-line bg-cream/40 p-5">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) ask();
                }}
                rows={5}
                disabled={thinking}
                placeholder="What’s on your mind?"
                className="w-full resize-y bg-transparent font-serif text-lg leading-relaxed text-ink placeholder:text-muted/60 focus:outline-none"
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-muted">
                  Voice
                  <select
                    value={voice}
                    onChange={(e) => chooseVoice(e.target.value)}
                    disabled={thinking}
                    title={voices.find((v) => v.id === voice)?.description}
                    className="rounded-md border border-line bg-paper px-2 py-1 text-ink"
                  >
                    {voices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  onClick={ask}
                  disabled={thinking || !draft.trim()}
                  className="rounded-full bg-pine px-6 py-2 text-sm font-medium text-paper transition-colors hover:bg-pine-dark disabled:opacity-40"
                >
                  {thinking ? 'Reading…' : 'Ask'}
                </button>
              </div>
            </section>

            {thinking && (
              <p className="mt-10 animate-pulse text-center font-serif italic text-muted">Looking through the library…</p>
            )}

            {loaded && !entries.length && !thinking && (
              <p className="mt-12 text-center text-muted">Write whatever is on your mind. Replies appear here.</p>
            )}

            <div className="mt-12 space-y-16">
              {entries.map((e, i) => (
                <EntryView
                  key={e.id}
                  entry={e}
                  voiceLabel={voiceLabel(e.voice)}
                  first={i === 0}
                  isSaved={isSaved}
                  onToggleSave={toggleSave}
                />
              ))}
            </div>
          </>
        )}

        {tab === 'book' && <Commonplace saved={saved} onRemove={unsavePassage} onNote={savePassage} />}

        {tab === 'memory' && <Memory notes={notes} onChange={saveNotes} />}
      </div>
    </main>
  );
}

function EntryView({
  entry,
  voiceLabel,
  first,
  isSaved,
  onToggleSave,
}: {
  entry: Entry;
  voiceLabel: string;
  first: boolean;
  isSaved: (id: string) => boolean;
  onToggleSave: (p: Passage) => void;
}) {
  const [open, setOpen] = useState(first);
  const date = new Date(entry.createdAt).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <article>
      <button onClick={() => setOpen((o) => !o)} className="block w-full text-left">
        <p className="text-xs uppercase tracking-wider text-muted">
          {date} · {voiceLabel}
        </p>
        <p className={`mt-2 whitespace-pre-wrap text-muted ${open ? '' : 'line-clamp-2'}`}>{entry.entry}</p>
      </button>

      {open && (
        <div className="mt-6 space-y-6 font-serif text-lg leading-relaxed text-ink">
          <p className="whitespace-pre-wrap">{entry.reply.opening}</p>
          {entry.reply.passages.map((p) => (
            <PassageCard key={p.chunkId} passage={p} saved={isSaved(p.chunkId)} onToggleSave={() => onToggleSave(p)} />
          ))}
          {entry.reply.closing && <p className="italic text-pine">{entry.reply.closing}</p>}
        </div>
      )}
    </article>
  );
}

function citation(p: Passage) {
  return [p.work, p.location].filter(Boolean).join(', ') + (p.translator ? ` (trans. ${p.translator})` : '');
}

function PassageCard({ passage: p, saved, onToggleSave }: { passage: Passage; saved: boolean; onToggleSave: () => void }) {
  return (
    <figure className="rounded-xl border border-line bg-cream/60 px-6 py-5">
      <blockquote className="whitespace-pre-wrap italic">“{p.quote}”</blockquote>
      <figcaption className="mt-3 flex items-start justify-between gap-4 font-sans text-sm">
        <span>
          <span className="font-medium text-ink">— {p.author}</span>
          <span className="text-muted">, {citation(p)}</span>
        </span>
        <button
          onClick={onToggleSave}
          className={`shrink-0 ${saved ? 'text-gold' : 'text-muted hover:text-ink'}`}
          title={saved ? 'Remove from commonplace book' : 'Save to commonplace book'}
        >
          {saved ? '★ Saved' : '☆ Save'}
        </button>
      </figcaption>
      {p.why && <p className="mt-3 font-sans text-sm leading-relaxed text-muted">{p.why}</p>}
    </figure>
  );
}

interface BookActions {
  onRemove: (p: Passage) => void;
  onNote: (p: Passage, note: string) => void;
}

function Commonplace({ saved, ...actions }: { saved: Saved[] } & BookActions) {
  if (!saved.length) {
    return <p className="mt-12 text-center text-muted">Passages you save from replies collect here.</p>;
  }
  return (
    <div className="space-y-8 font-serif text-lg leading-relaxed">
      {saved.map((s) => (
        <SavedCard key={s.chunkId} saved={s} {...actions} />
      ))}
    </div>
  );
}

function SavedCard({ saved: s, onRemove, onNote }: { saved: Saved } & BookActions) {
  const [note, setNote] = useState(s.note);
  const dirty = note !== s.note;
  return (
    <div>
      <PassageCard passage={s} saved onToggleSave={() => onRemove(s)} />
      <div className="mt-2 flex items-start gap-2 font-sans text-sm">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={1}
          placeholder="Add a note…"
          className="flex-1 resize-y rounded-md border border-transparent bg-transparent px-2 py-1 text-muted focus:border-line focus:outline-none"
        />
        {dirty && (
          <button onClick={() => onNote(s, note)} className="rounded-md bg-pine px-3 py-1 text-paper">
            Save note
          </button>
        )}
      </div>
    </div>
  );
}

function Memory({ notes, onChange }: { notes: string[]; onChange: (notes: string[]) => void }) {
  const [adding, setAdding] = useState('');
  const input = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className="mb-6 text-sm text-muted">
        The advisor keeps these notes about you and updates them as you write. Remove anything that’s wrong, or add
        something it should know.
      </p>
      {notes.length ? (
        <ul className="space-y-2">
          {notes.map((n, i) => (
            <li key={`${i}-${n}`} className="group flex items-start justify-between gap-4 rounded-lg px-3 py-2 hover:bg-cream/60">
              <span>{n}</span>
              <button
                onClick={() => onChange(notes.filter((_, j) => j !== i))}
                className="text-muted opacity-0 transition-opacity hover:text-ember group-hover:opacity-100"
                title="Forget this"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">Nothing yet.</p>
      )}
      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!adding.trim()) return;
          onChange([...notes, adding.trim()]);
          setAdding('');
          input.current?.focus();
        }}
      >
        <input
          ref={input}
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          placeholder="Something it should remember…"
          className="flex-1 rounded-md border border-line bg-paper px-3 py-2 focus:outline-none"
        />
        <button className="rounded-md bg-pine px-4 py-2 text-sm text-paper">Add</button>
      </form>
    </div>
  );
}
