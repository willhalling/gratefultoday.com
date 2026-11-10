'use client';

import { Accordion, AccordionItem } from '@heroui/react';
import { X } from 'lucide-react';

/** Small form primitives shared by the TikTok maker drawers. */

export const inputClass =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none';
export const buttonClass =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40';
export const ghostClass =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-800 disabled:opacity-40';

export function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-b border-neutral-200 pb-5 last:border-0">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</h3>
      {children}
    </section>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm text-neutral-700">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
    </label>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format = (v) => v.toFixed(2),
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  return (
    <label className="block text-sm text-neutral-700">
      <span className="mb-1 flex justify-between font-medium">
        {label}
        <span className="tabular-nums text-neutral-500">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-neutral-900"
      />
    </label>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-neutral-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-neutral-900" />
      {label}
    </label>
  );
}

/** Advanced settings: collapsed by default, but always visible as a heading. */
export function Advanced({ children, testId }: { children: React.ReactNode; testId?: string }) {
  return (
    <Accordion isCompact variant="light" className="px-0" data-testid={testId}>
      <AccordionItem
        key="advanced"
        aria-label="Advanced"
        title={<span className="text-sm font-medium text-neutral-600">Advanced</span>}
        classNames={{ trigger: 'py-1', content: 'space-y-3 pb-1' }}
      >
        {children}
      </AccordionItem>
    </Accordion>
  );
}

export interface AudioFile {
  name: string;
  buffer: AudioBuffer;
}

export function AudioPicker({
  label,
  value,
  onPick,
  onClear,
  testId,
  note,
}: {
  label: string;
  value: AudioFile | null;
  onPick: (file: File) => void;
  onClear: () => void;
  testId: string;
  note?: string;
}) {
  return (
    <Field label={label}>
      {value ? (
        <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm">
          <span className="truncate">
            {value.name} · {value.buffer.duration.toFixed(1)}s{note ? ` · ${note}` : ''}
          </span>
          <button type="button" onClick={onClear} className="ml-2 text-neutral-500 hover:text-neutral-900" aria-label={`Remove ${label}`}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <input
          type="file"
          accept="audio/*"
          data-testid={testId}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file);
            e.target.value = '';
          }}
          className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-900 file:px-3 file:py-2 file:text-white"
        />
      )}
    </Field>
  );
}
