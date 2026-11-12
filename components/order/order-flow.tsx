'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { PublicOrder } from '@/lib/orders/store';
import { MAX_WORDS, wordCount } from '@/lib/orders/types';
import { RECOVERY_MILESTONES, type Occasion } from '@/lib/product';

/**
 * The order flow: one question per screen, full-bleed and dark, like the
 * videos themselves. Five or six taps and a sentence, then the script.
 */

const THANKS_WHO = ['teacher', 'teaching assistant', 'nurse', 'doctor', 'carer', 'colleague', 'parent', 'grandparent', 'friend'];
const RECOVERY_WHO = ['partner', 'parent', 'son or daughter', 'brother or sister', 'friend', 'sponsor'];
const MILESTONES = RECOVERY_MILESTONES.filter((m) => m !== 'Another milestone');

type StepId = 'occasion' | 'name' | 'who' | 'milestone' | 'story' | 'from' | 'email';

interface Draft {
  name: string;
  who: string;
  whoOther: string;
  milestone: string;
  milestoneOther: string;
  story: string;
  from: string;
  email: string;
}

const EMPTY: Draft = { name: '', who: '', whoOther: '', milestone: '', milestoneOther: '', story: '', from: '', email: '' };

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const firstName = (s: string) => s.trim().split(/\s+/)[0] ?? '';

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Try again.');
  return data as T;
}

function payload(occasion: Occasion, d: Draft) {
  const other = d.who === 'other';
  const shared = {
    recipient_name: d.name,
    sender_name: d.from,
    email: d.email,
    relationship: d.who,
    relationship_other: other ? d.whoOther : '',
  };
  if (occasion === 'thanks') return { occasion, answers: { ...shared, what_they_did: d.story } };
  return {
    occasion,
    answers: {
      ...shared,
      milestone: d.milestone,
      milestone_other: d.milestone === 'Another milestone' ? d.milestoneOther : '',
      what_has_changed: d.story,
    },
  };
}

export default function OrderFlow({
  initialOccasion,
  occasionChosen,
  initialRelationship,
}: {
  initialOccasion: Occasion;
  occasionChosen: boolean;
  initialRelationship?: string;
}) {
  const [occasion, setOccasion] = useState<Occasion>(initialOccasion);
  const [d, setD] = useState<Draft>({ ...EMPTY, who: initialRelationship ?? '' });
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps: StepId[] = [
    ...(occasionChosen ? [] : (['occasion'] as const)),
    'name',
    ...(initialRelationship && occasion === 'thanks' ? [] : (['who'] as const)),
    ...(occasion === 'recovery' ? (['milestone'] as const) : []),
    'story',
    'from',
    'email',
  ];
  const [index, setIndex] = useState(0);
  const step = steps[Math.min(index, steps.length - 1)];
  const name = firstName(d.name);

  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const next = () => setIndex((i) => Math.min(i + 1, steps.length - 1));
  const back = () => setIndex((i) => Math.max(i - 1, 0));

  const ready: Record<StepId, boolean> = {
    occasion: true,
    name: d.name.trim().length > 0,
    who: d.who !== '' && (d.who !== 'other' || d.whoOther.trim().length > 0),
    milestone: d.milestone !== '' && (d.milestone !== 'Another milestone' || d.milestoneOther.trim().length > 0),
    story: d.story.trim().length >= 12,
    from: d.from.trim().length > 0,
    email: /^\S+@\S+\.\S+$/.test(d.email.trim()),
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      setOrder(await post<PublicOrder>('/api/orders', payload(occasion, d)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const advance = () => {
    if (!ready[step] || busy) return;
    if (step === 'email') submit();
    else next();
  };

  if (order) return <ScriptReview order={order} onChange={setOrder} />;
  if (busy) return <Writing name={name} />;

  return (
    <Stage>
      <TopBar
        progress={(index + 1) / steps.length}
        onBack={index > 0 ? back : undefined}
      />

      <form
        key={step}
        onSubmit={(e) => {
          e.preventDefault();
          advance();
        }}
        className="mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-xl flex-col justify-center px-6 pb-16"
      >
        {step === 'occasion' && (
          <Question title="Say what you never got to say.">
            <div className="grid gap-3">
              <BigChoice
                title="Thank you"
                hint="The teacher, the nurse, the carer"
                onClick={() => {
                  setOccasion('thanks');
                  next();
                }}
              />
              <BigChoice
                title="Recovery"
                hint="30 days. A year. Ten."
                onClick={() => {
                  setOccasion('recovery');
                  set({ who: '' });
                  next();
                }}
              />
            </div>
          </Question>
        )}

        {step === 'name' && (
          <Question title="Who’s it for?">
            <BigInput value={d.name} onChange={(v) => set({ name: v })} placeholder="Their name" maxLength={60} autoComplete="off" />
          </Question>
        )}

        {step === 'who' && (
          <Question title={occasion === 'thanks' ? `${name} is your…` : `You’re ${name}’s…`}>
            <Chips
              options={[...(occasion === 'thanks' ? THANKS_WHO : RECOVERY_WHO), 'other']}
              value={d.who}
              onPick={(v) => {
                set({ who: v });
                if (v !== 'other') next();
              }}
            />
            {d.who === 'other' && (
              <BigInput value={d.whoOther} onChange={(v) => set({ whoOther: v })} placeholder="Tell us" maxLength={60} small />
            )}
          </Question>
        )}

        {step === 'milestone' && (
          <Question title="How long?">
            <Chips
              options={[...MILESTONES, 'Another milestone']}
              labels={{ 'Another milestone': 'Other' }}
              value={d.milestone}
              onPick={(v) => {
                set({ milestone: v });
                if (v !== 'Another milestone') next();
              }}
            />
            {d.milestone === 'Another milestone' && (
              <BigInput value={d.milestoneOther} onChange={(v) => set({ milestoneOther: v })} placeholder="100 days" maxLength={60} small />
            )}
          </Question>
        )}

        {step === 'story' && (
          <Question
            title={occasion === 'thanks' ? `What did ${name} do?` : `What are you proud of?`}
            hint="One true detail. We’ll find the words."
          >
            <BigTextArea
              value={d.story}
              onChange={(v) => set({ story: v })}
              onEnter={advance}
              maxLength={1200}
              placeholder={
                occasion === 'thanks'
                  ? 'She gave Amara a little job every morning. By summer, Amara read to the whole class.'
                  : 'He’s at Sunday lunch every week now. The kids light up when he walks in.'
              }
            />
          </Question>
        )}

        {step === 'from' && (
          <Question title="From?">
            <BigInput value={d.from} onChange={(v) => set({ from: v })} placeholder="Your name, or names" maxLength={120} autoComplete="name" />
          </Question>
        )}

        {step === 'email' && (
          <Question title="Where do we send it?" hint="Free. You’ll see every word first.">
            <BigInput
              value={d.email}
              onChange={(v) => set({ email: v })}
              placeholder="you@email.com"
              maxLength={200}
              type="email"
              autoComplete="email"
              inputMode="email"
            />
          </Question>
        )}

        {error && <p className="mt-6 text-center text-sm text-[#f2a58e]">{error}</p>}

        {showGo(step, d) && (
          <div className="card-in-late mt-10 flex justify-center">
            <GoButton disabled={!ready[step]}>{step === 'email' ? 'Write it' : 'Next'}</GoButton>
          </div>
        )}
      </form>
    </Stage>
  );
}

/** Choice screens move on by themselves, unless "Other" needs typing. */
function showGo(step: StepId, d: Draft) {
  if (step === 'occasion') return false;
  if (step === 'who') return d.who === 'other';
  if (step === 'milestone') return d.milestone === 'Another milestone';
  return true;
}

/* ---------- Pieces ---------- */

export function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div className="stage">
      <div className="stage-grain" />
      {children}
    </div>
  );
}

function TopBar({ progress, onBack }: { progress: number; onBack?: () => void }) {
  return (
    <div className="mx-auto flex h-20 w-full max-w-xl items-center gap-4 px-6">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className={`-ml-2 grid h-10 w-10 place-items-center rounded-full text-2xl text-white/70 transition hover:bg-white/10 hover:text-white ${onBack ? '' : 'invisible'}`}
      >
        ‹
      </button>
      <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full bg-[#f5c542] transition-all duration-700 ease-out" style={{ width: `${progress * 100}%` }} />
      </div>
      <Link
        href="/"
        aria-label="Close"
        className="-mr-2 grid h-10 w-10 place-items-center rounded-full text-xl text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        ×
      </Link>
    </div>
  );
}

function Question({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-8">
      <div className="card-in text-center">
        <h1 className="font-serif text-4xl leading-[1.08] font-medium text-balance sm:text-6xl">{title}</h1>
        {hint && <p className="mt-4 text-white/55">{hint}</p>}
      </div>
      <div className="card-in-late space-y-6">{children}</div>
    </div>
  );
}

const inputBase =
  'w-full border-0 border-b-2 border-white/20 bg-transparent text-center font-serif text-white placeholder:text-white/25 caret-[#f5c542] transition focus:border-[#f5c542] focus:outline-none focus:ring-0';

function BigInput({
  value,
  onChange,
  small,
  ...rest
}: { value: string; onChange: (v: string) => void; small?: boolean } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return (
    <input
      {...rest}
      autoFocus
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputBase} ${small ? 'py-2 text-2xl' : 'py-3 text-3xl sm:text-4xl'}`}
    />
  );
}

function BigTextArea({
  value,
  onChange,
  onEnter,
  placeholder,
  maxLength,
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
  placeholder: string;
  maxLength: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      autoFocus
      rows={2}
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onEnter();
        }
      }}
      className={`${inputBase} resize-none py-3 text-2xl leading-snug sm:text-3xl`}
    />
  );
}

function Chips({
  options,
  value,
  onPick,
  labels = {},
}: {
  options: readonly string[];
  value: string;
  onPick: (v: string) => void;
  labels?: Record<string, string>;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onPick(o)}
          className={`rounded-full border px-5 py-2.5 text-lg transition ${
            value === o
              ? 'border-[#f5c542] bg-[#f5c542] text-[#0b0b0b]'
              : 'border-white/20 text-white/85 hover:border-white/60 hover:text-white'
          }`}
        >
          {labels[o] ?? cap(o)}
        </button>
      ))}
    </div>
  );
}

function BigChoice({ title, hint, onClick }: { title: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-3xl border border-white/15 bg-white/[0.03] px-7 py-6 text-left transition hover:border-[#f5c542]/70 hover:bg-white/[0.06]"
    >
      <span className="flex items-center justify-between font-serif text-3xl">
        {title}
        <span className="text-white/40 transition group-hover:translate-x-1 group-hover:text-[#f5c542]">→</span>
      </span>
      <span className="mt-1 block text-white/50">{hint}</span>
    </button>
  );
}

export function GoButton({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void }) {
  return (
    <button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={disabled}
      className="rounded-full bg-[#f5c542] px-10 py-4 text-lg font-semibold text-[#0b0b0b] shadow-[0_0_40px_-8px_rgb(245_197_66/0.6)] transition hover:scale-[1.03] disabled:scale-100 disabled:bg-white/10 disabled:text-white/30 disabled:shadow-none"
    >
      {children}
    </button>
  );
}

function Writing({ name }: { name: string }) {
  return (
    <Stage>
      <div className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
        <p className="card-in font-serif text-4xl sm:text-6xl">Finding the words{name ? ` for ${name}` : ''}</p>
        <p className="breathe mt-6 text-white/50">About 20 seconds</p>
      </div>
    </Stage>
  );
}

/* ---------- Script review ---------- */

function ScriptReview({ order, onChange }: { order: PublicOrder; onChange: (o: PublicOrder) => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(order.script?.title ?? '');
  const [lines, setLines] = useState<string[]>(order.script?.lines ?? []);
  const [note, setNote] = useState('');
  const [rewriting, setRewriting] = useState(false);
  const [busy, setBusy] = useState<'approve' | 'regenerate' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (order.status === 'needs_review' || order.status === 'declined') return <Held status={order.status} occasion={order.occasion} />;
  if (busy === 'regenerate') return <Writing name="" />;

  const words = wordCount(lines);
  const tooLong = words > MAX_WORDS;
  const setLine = (i: number, v: string) => setLines((ls) => ls.map((l, j) => (j === i ? v : l)));
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, j) => j !== i));

  const regenerate = async () => {
    setBusy('regenerate');
    setError(null);
    try {
      const next = await post<PublicOrder>(`/api/orders/${order.id}/regenerate`, { note });
      onChange(next);
      setTitle(next.script?.title ?? '');
      setLines(next.script?.lines ?? []);
      setNote('');
      setRewriting(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const approve = async () => {
    setBusy('approve');
    setError(null);
    try {
      const next = await post<PublicOrder>(`/api/orders/${order.id}/approve`, {
        title: title.trim(),
        lines: lines.map((l) => l.trim()).filter(Boolean),
      });
      if (next.status === 'approved') router.push(`/order/${order.id}`);
      else onChange(next);
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
    }
  };

  return (
    <Stage>
      <div className="mx-auto w-full max-w-xl px-6 pt-16 pb-48">
        <p className="card-in text-center text-xs font-semibold tracking-[0.3em] text-[#f5c542] uppercase">Your script</p>
        <GrowingText
          value={title}
          maxLength={80}
          onChange={setTitle}
          label="Title"
          className="card-in mt-4 rounded-xl px-2 py-1 font-serif text-3xl leading-tight font-medium text-white focus:bg-white/[0.06] sm:text-5xl"
        />
        <p className="card-in-late mt-3 text-center text-sm text-white/45">Tap any line to change it.</p>

        <ol className="card-in-late mt-12 space-y-1">
          {lines.map((line, i) => (
            <li key={i} className="group relative">
              <GrowingText
                value={line}
                maxLength={90}
                onChange={(v) => setLine(i, v)}
                label={`Line ${i + 1}`}
                className="rounded-xl px-3 py-1.5 font-serif text-2xl leading-snug text-white/90 transition hover:bg-white/[0.04] focus:bg-white/[0.06] focus:text-white focus:ring-1 focus:ring-[#f5c542]/60 sm:text-[1.7rem]"
              />
              <button
                type="button"
                onClick={() => removeLine(i)}
                aria-label={`Remove line ${i + 1}`}
                className="absolute top-1/2 -right-8 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-white/40 hover:text-white group-focus-within:grid group-hover:grid"
              >
                ×
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-4 text-center">
          <button type="button" onClick={() => setLines((ls) => [...ls, ''])} className="text-sm text-white/40 hover:text-white">
            + Add a line
          </button>
        </div>

        {order.generationsLeft > 0 && (
          <div className="mt-14 text-center">
            {rewriting ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  regenerate();
                }}
                className="card-in space-y-4"
              >
                <input
                  autoFocus
                  value={note}
                  maxLength={400}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Shorter. Mention the school trip."
                  className={`${inputBase} py-2 text-xl`}
                />
                <button type="submit" className="rounded-full border border-white/25 px-6 py-2.5 text-white/85 hover:border-white/60 hover:text-white">
                  Rewrite it
                </button>
              </form>
            ) : (
              <button type="button" onClick={() => setRewriting(true)} className="text-white/55 underline-offset-4 hover:text-white hover:underline">
                Not quite right? Rewrite it
              </button>
            )}
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-[#070908] via-[#070908]/90 to-transparent px-6 pt-16 pb-8">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-3">
          {error && <p className="text-sm text-[#f2a58e]">{error}</p>}
          <GoButton onClick={approve} disabled={busy !== null || tooLong || lines.filter((l) => l.trim()).length < 3}>
            {busy === 'approve' ? 'One moment…' : 'Make my video'}
          </GoButton>
          <p className={`text-sm ${tooLong ? 'text-[#f2a58e]' : 'text-white/40'}`}>
            {tooLong ? `A little long. Keep it under ${MAX_WORDS} words.` : `About ${Math.max(10, Math.round(words / 2.5))} seconds`}
          </p>
        </div>
      </div>
    </Stage>
  );
}

/** A centred text box that wraps and grows instead of cutting off long lines. */
function GrowingText({
  value,
  onChange,
  label,
  maxLength,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  maxLength: number;
  className: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      maxLength={maxLength}
      aria-label={label}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
      onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
      className={`block w-full resize-none overflow-hidden border-0 bg-transparent text-center focus:outline-none ${className}`}
    />
  );
}

function Held({ status, occasion }: { status: 'needs_review' | 'declined'; occasion: Occasion }) {
  return (
    <Stage>
      <div className="mx-auto flex min-h-[100svh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <h1 className="card-in font-serif text-4xl sm:text-5xl">
          {status === 'needs_review' ? 'We’ll read this one ourselves.' : 'We can’t make this one.'}
        </h1>
        <p className="card-in-late mt-5 text-white/55">
          {status === 'needs_review'
            ? 'A person will check it before we make the video. We’ll email you, usually within a day.'
            : occasion === 'recovery'
              ? 'These videos are for sincere recovery celebrations.'
              : 'These videos are for sincere thank-yous.'}
        </p>
        <Link href="/" className="card-in-late mt-10 text-white/55 underline-offset-4 hover:text-white hover:underline">
          Back home
        </Link>
      </div>
    </Stage>
  );
}
