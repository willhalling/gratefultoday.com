'use client';

import type { ReactNode } from 'react';

const inputClass =
  'w-full rounded-xl border border-line bg-white px-4 py-3 text-base text-ink placeholder:text-muted/60 focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/20';

export function Field({
  label,
  hint,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2 font-medium">
        {label}
        {optional && <span className="text-sm font-normal text-muted">Optional</span>}
      </span>
      {hint && <span className="mt-0.5 block text-sm text-muted">{hint}</span>}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClass} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={4} {...props} className={inputClass} />;
}

export function Select({
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { options: readonly { value: string; label: string }[] }) {
  return (
    <select {...props} className={inputClass}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Choice<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly { value: T; label: string; hint?: string }[];
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-xl border px-4 py-3 text-left transition ${
            value === o.value ? 'border-pine bg-pine/5 ring-2 ring-pine/20' : 'border-line bg-white hover:border-pine/40'
          }`}
        >
          <span className="block font-medium">{o.label}</span>
          {o.hint && <span className="mt-0.5 block text-sm text-muted">{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

export function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="w-full rounded-full bg-pine px-7 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-pine-dark disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="rounded-full border border-pine px-5 py-2.5 font-semibold text-pine transition hover:bg-pine hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl bg-ember/10 px-4 py-3 text-sm text-ember">
      {children}
    </p>
  );
}
