'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { PublicOrder } from '@/lib/orders/store';
import {
  MAX_WORDS,
  RECOVERY_RELATIONSHIPS,
  THANKS_RELATIONSHIPS,
  wordCount,
  type RecoveryAnswers,
  type ThanksAnswers,
} from '@/lib/orders/types';
import { OCCASIONS, RECOVERY_MILESTONES, type Occasion } from '@/lib/product';
import {
  Choice,
  ErrorNote,
  Field,
  PrimaryButton,
  SecondaryButton,
  Select,
  TextArea,
  TextInput,
} from './fields';

type Answers = Omit<ThanksAnswers, 'relationship' | 'tone'> &
  Omit<RecoveryAnswers, 'relationship' | 'tone'> & { relationship: string; tone: string };

const EMPTY: Answers = {
  recipient_name: '',
  address_as: '',
  sender_name: '',
  specific_memory: '',
  religious: false,
  anything_to_avoid: '',
  name_pronunciation: '',
  email: '',
  relationship: 'teacher',
  relationship_other: '',
  what_they_did: '',
  what_has_changed: '',
  milestone: '30 days',
  milestone_other: '',
  recovering_from: '',
  tone: 'heartfelt',
};

const opts = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: x[0].toUpperCase() + x.slice(1) }));

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Please try again.');
  return data as T;
}

/** The answers for one occasion, without the other occasion's fields. */
function payload(occasion: Occasion, a: Answers) {
  const shared = {
    recipient_name: a.recipient_name,
    address_as: a.address_as,
    sender_name: a.sender_name,
    specific_memory: a.specific_memory,
    religious: a.religious,
    anything_to_avoid: a.anything_to_avoid,
    name_pronunciation: a.name_pronunciation,
    email: a.email,
    relationship: a.relationship,
    relationship_other: a.relationship === 'other' ? a.relationship_other : '',
    tone: a.tone,
  };
  return occasion === 'thanks'
    ? { occasion, answers: { ...shared, what_they_did: a.what_they_did } }
    : {
        occasion,
        answers: {
          ...shared,
          milestone: a.milestone,
          milestone_other: a.milestone === 'Another milestone' ? a.milestone_other : '',
          what_has_changed: a.what_has_changed,
          recovering_from: a.recovering_from,
        },
      };
}

export default function OrderFlow({ initialOccasion, initialRelationship }: { initialOccasion: Occasion; initialRelationship?: string }) {
  const [occasion, setOccasion] = useState<Occasion>(initialOccasion);
  const [answers, setAnswers] = useState<Answers>({
    ...EMPTY,
    relationship: initialOccasion === 'recovery' ? 'friend' : (initialRelationship ?? 'teacher'),
  });
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Answers>(key: K) => (value: Answers[K]) => setAnswers((a) => ({ ...a, [key]: value }));
  const onText =
    (key: keyof Answers) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setAnswers((a) => ({ ...a, [key]: e.target.value }));

  const switchOccasion = (next: Occasion) => {
    setOccasion(next);
    setAnswers((a) => ({ ...a, relationship: next === 'recovery' ? 'friend' : 'teacher', tone: 'heartfelt' }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setOrder(await post<PublicOrder>('/api/orders', payload(occasion, answers)));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (order) return <ScriptReview order={order} onChange={setOrder} />;

  const isThanks = occasion === 'thanks';

  return (
    <form onSubmit={submit} className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-pine sm:text-4xl">Make a video</h1>
        <p className="mt-2 text-muted">
          A few questions, then we’ll write a short script for you to check. Nothing is made until you approve it.
        </p>
      </div>

      <Field label="What kind of video?">
        <Choice
          value={occasion}
          onChange={switchOccasion}
          options={[
            { value: 'thanks', label: 'Thank you', hint: 'Teacher, nurse, carer, colleague…' },
            { value: 'recovery', label: 'Recovery milestone', hint: OCCASIONS.recovery.pitch.split(':')[0] },
          ]}
        />
      </Field>

      <section className="space-y-5 rounded-2xl border border-line bg-paper p-5 sm:p-7">
        <h2 className="text-xl font-semibold">Who is it for?</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Their name">
            <TextInput required maxLength={60} value={answers.recipient_name} onChange={onText('recipient_name')} placeholder="Priya Patel" />
          </Field>
          <Field label="What do you call them?" hint="If different from their name" optional>
            <TextInput maxLength={60} value={answers.address_as} onChange={onText('address_as')} placeholder={isThanks ? 'Mrs Patel' : 'Mum'} />
          </Field>
        </div>
        <Field label="How do you say their name?" hint="Helps the narrator get it right" optional>
          <TextInput maxLength={80} value={answers.name_pronunciation} onChange={onText('name_pronunciation')} placeholder="PREE-ya" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={isThanks ? 'They are…' : 'You are their…'}>
            <Select
              value={answers.relationship}
              onChange={onText('relationship')}
              options={opts(isThanks ? THANKS_RELATIONSHIPS : RECOVERY_RELATIONSHIPS)}
            />
          </Field>
          {answers.relationship === 'other' && (
            <Field label="Tell us the relationship">
              <TextInput required maxLength={60} value={answers.relationship_other} onChange={onText('relationship_other')} />
            </Field>
          )}
        </div>
        {!isThanks && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Milestone">
              <Select value={answers.milestone} onChange={onText('milestone')} options={opts(RECOVERY_MILESTONES)} />
            </Field>
            {answers.milestone === 'Another milestone' && (
              <Field label="Which milestone?">
                <TextInput required maxLength={60} value={answers.milestone_other} onChange={onText('milestone_other')} placeholder="100 days" />
              </Field>
            )}
          </div>
        )}
      </section>

      <section className="space-y-5 rounded-2xl border border-line bg-paper p-5 sm:p-7">
        <h2 className="text-xl font-semibold">What do you want to say?</h2>
        {isThanks ? (
          <Field label="Why are you grateful?" hint="What they did, and the difference it made. Real details make it special.">
            <TextArea
              required
              maxLength={1200}
              value={answers.what_they_did}
              onChange={onText('what_they_did')}
              placeholder="She noticed Amara was nervous about reading aloud and gave her a little job every morning. By summer she was reading to the whole class."
            />
          </Field>
        ) : (
          <Field label="What have you noticed, or what do you admire?" hint="What’s changed, or what you’re proud of them for.">
            <TextArea
              required
              maxLength={1200}
              value={answers.what_has_changed}
              onChange={onText('what_has_changed')}
              placeholder="He’s there for Sunday lunch every week now, and he actually listens. The kids light up when he walks in."
            />
          </Field>
        )}
        <Field label="A moment, habit or saying only they would recognise" optional>
          <TextArea rows={3} maxLength={600} value={answers.specific_memory} onChange={onText('specific_memory')} />
        </Field>
        {!isThanks && (
          <Field
            label="What are they recovering from?"
            hint="Only fill this in if they’d be happy to hear it said. Leave it blank and the video won’t mention it."
            optional
          >
            <TextInput maxLength={80} value={answers.recovering_from} onChange={onText('recovering_from')} placeholder="Alcohol" />
          </Field>
        )}
        <Field label="Tone">
          <Choice
            value={answers.tone}
            onChange={set('tone')}
            options={[
              { value: 'heartfelt', label: 'Heartfelt' },
              { value: 'warm-and-light', label: 'Warm and light' },
              ...(isThanks ? [{ value: 'funny', label: 'A little funny' }] : []),
            ]}
          />
        </Field>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={answers.religious}
            onChange={(e) => set('religious')(e.target.checked)}
            className="mt-1 h-5 w-5 accent-pine"
          />
          <span>
            <span className="font-medium">It’s fine to mention faith</span>
            <span className="block text-sm text-muted">Otherwise the message stays non-religious.</span>
          </span>
        </label>
        <Field label="Anything to avoid?" optional>
          <TextInput maxLength={300} value={answers.anything_to_avoid} onChange={onText('anything_to_avoid')} />
        </Field>
      </section>

      <section className="space-y-5 rounded-2xl border border-line bg-paper p-5 sm:p-7">
        <h2 className="text-xl font-semibold">From you</h2>
        <Field label="Who is it from?" hint="Your name, several names, or a group">
          <TextInput
            required
            maxLength={120}
            value={answers.sender_name}
            onChange={onText('sender_name')}
            placeholder={isThanks ? 'Everyone in Year 4' : 'Sam and the kids'}
          />
        </Field>
        <Field label="Your email" hint="We’ll send you the video here. Never shared, never used for marketing.">
          <TextInput required type="email" maxLength={200} value={answers.email} onChange={onText('email')} autoComplete="email" />
        </Field>
      </section>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <PrimaryButton type="submit" disabled={busy}>
          {busy ? 'Writing your script…' : 'Write my script'}
        </PrimaryButton>
        <p className="text-sm text-muted">{busy ? 'This takes about 20 seconds.' : 'Free. You’ll check every word next.'}</p>
      </div>
    </form>
  );
}

function ScriptReview({ order, onChange }: { order: PublicOrder; onChange: (o: PublicOrder) => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(order.script?.title ?? '');
  const [lines, setLines] = useState<string[]>(order.script?.lines ?? []);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'approve' | 'regenerate' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (order.status === 'needs_review' || order.status === 'declined') {
    return <Held status={order.status} />;
  }

  const words = wordCount(lines);
  const tooLong = words > MAX_WORDS;

  const setLine = (i: number, value: string) => setLines((ls) => ls.map((l, j) => (j === i ? value : l)));
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, j) => j !== i));
  const addLineAfter = (i: number) => setLines((ls) => [...ls.slice(0, i + 1), '', ...ls.slice(i + 1)]);

  const regenerate = async () => {
    setBusy('regenerate');
    setError(null);
    try {
      const next = await post<PublicOrder>(`/api/orders/${order.id}/regenerate`, { note });
      onChange(next);
      setTitle(next.script?.title ?? '');
      setLines(next.script?.lines ?? []);
      setNote('');
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-pine sm:text-4xl">Check your script</h1>
        <p className="mt-2 text-muted">
          Each line appears on screen as the narrator says it. Change any word, add or remove lines, then approve.
        </p>
      </div>

      <Field label="Title">
        <TextInput maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>

      <ol className="space-y-2">
        {lines.map((line, i) => (
          <li key={i} className="group flex items-center gap-2">
            <span className="w-6 shrink-0 text-right text-sm text-muted">{i + 1}</span>
            <input
              value={line}
              maxLength={90}
              onChange={(e) => setLine(i, e.target.value)}
              aria-label={`Line ${i + 1}`}
              className="min-w-0 flex-1 rounded-xl border border-line bg-white px-4 py-2.5 font-serif text-lg focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20"
            />
            <button
              type="button"
              onClick={() => addLineAfter(i)}
              aria-label={`Add a line after line ${i + 1}`}
              className="h-9 w-9 shrink-0 rounded-full text-xl text-muted hover:bg-line/60 hover:text-pine"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => removeLine(i)}
              aria-label={`Remove line ${i + 1}`}
              className="h-9 w-9 shrink-0 rounded-full text-xl text-muted hover:bg-line/60 hover:text-ember"
            >
              ×
            </button>
          </li>
        ))}
      </ol>
      <p className={`text-sm ${tooLong ? 'text-ember' : 'text-muted'}`}>
        {words} words · about {Math.round(words / 2.5)} seconds{tooLong ? ` · please keep it under ${MAX_WORDS} words` : ''}
      </p>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <PrimaryButton onClick={approve} disabled={busy !== null || tooLong || lines.filter((l) => l.trim()).length < 3}>
          {busy === 'approve' ? 'Saving…' : 'Approve script'}
        </PrimaryButton>
        <p className="text-sm text-muted">Next, we’ll make your video.</p>
      </div>

      {order.generationsLeft > 0 && (
        <section className="space-y-3 rounded-2xl border border-line bg-paper p-5 sm:p-7">
          <h2 className="text-lg font-semibold">Not quite right?</h2>
          <Field label="Tell us what to change" optional>
            <TextInput
              maxLength={400}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Make it shorter, and mention the school trip"
            />
          </Field>
          <div className="flex items-center gap-3">
            <SecondaryButton onClick={regenerate} disabled={busy !== null}>
              {busy === 'regenerate' ? 'Rewriting…' : 'Write a new version'}
            </SecondaryButton>
            <span className="text-sm text-muted">
              {order.generationsLeft} {order.generationsLeft === 1 ? 'version' : 'versions'} left
            </span>
          </div>
          <p className="text-sm text-muted">A new version replaces the lines above, including your edits.</p>
        </section>
      )}
    </div>
  );
}

function Held({ status }: { status: 'needs_review' | 'declined' }) {
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-3xl font-semibold text-pine">
        {status === 'needs_review' ? 'We’d like to take a look first' : 'We can’t make this one'}
      </h1>
      <p className="mx-auto max-w-md text-muted">
        {status === 'needs_review'
          ? 'Something in this message means a person on our team should read it before we make the video. We’ll email you, usually within a day.'
          : 'GratefulToday videos are for sincere thank-yous and recovery celebrations, and this request doesn’t fit. If you think we got it wrong, reply to any of our emails.'}
      </p>
    </div>
  );
}
