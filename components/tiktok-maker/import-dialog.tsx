'use client';

import { useState } from 'react';
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Progress } from '@heroui/react';
import { buttonClass, ghostClass } from './controls';
import { stripAudioTags, type LibraryScript } from '@/lib/tiktok-maker/bulk';
import type { ImportRow } from '@/lib/tiktok-maker/script-io';

export interface ImportPlan {
  fileName: string;
  creates: ImportRow[];
  updates: (ImportRow & { id: string; before: LibraryScript })[];
  unchanged: number;
  /** New rows whose script text already exists in the library (skipped, not duplicated). */
  duplicates: ImportRow[];
  errors: string[];
}

/** Match imported rows to the library: by id → update/unchanged; else new (unless the text already exists). */
export function planImport(fileName: string, rows: ImportRow[], errors: string[], library: LibraryScript[]): ImportPlan {
  const byId = new Map(library.map((s) => [s.id, s]));
  const texts = new Set(library.map((s) => s.script.trim()));
  const plan: ImportPlan = { fileName, creates: [], updates: [], unchanged: 0, duplicates: [], errors: [...errors] };
  const seenNew = new Set<string>();
  for (const row of rows) {
    const existing = row.id ? byId.get(row.id) : undefined;
    if (existing) {
      if (existing.day === row.day && existing.title === row.title && existing.script === row.script) plan.unchanged++;
      else plan.updates.push({ ...row, id: existing.id, before: existing });
    } else if (texts.has(row.script.trim()) || seenNew.has(row.script.trim())) {
      plan.duplicates.push(row);
    } else {
      seenNew.add(row.script.trim());
      plan.creates.push({ ...row, id: null });
    }
  }
  return plan;
}

const oneLine = (s: string) => stripAudioTags(s).replace(/\s+/g, ' ').trim();

interface ImportDialogProps {
  plan: ImportPlan | null;
  onClose: () => void;
  onConfirm: (
    plan: ImportPlan,
    onProgress: (done: number, total: number) => void,
  ) => Promise<{ created: number; updated: number; failed: string[] }>;
}

export default function ImportDialog({ plan, onClose, onConfirm }: ImportDialogProps) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ created: number; updated: number; failed: string[] } | null>(null);
  const busy = progress !== null && result === null;
  const changes = plan ? plan.creates.length + plan.updates.length : 0;

  const close = () => {
    if (busy) return;
    setProgress(null);
    setResult(null);
    onClose();
  };

  return (
    <Modal isOpen={!!plan} onOpenChange={(open) => !open && close()} size="3xl" scrollBehavior="inside" isDismissable={!busy}>
      <ModalContent>
        {plan && (
          <>
            <ModalHeader className="flex flex-col gap-1">
              Import scripts
              <span className="text-sm font-normal text-neutral-500">{plan.fileName}</span>
            </ModalHeader>
            <ModalBody data-testid="import-dialog">
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4" data-testid="import-summary">
                <div className="rounded-lg bg-emerald-50 p-3">
                  <div className="text-2xl font-semibold text-emerald-800">{plan.creates.length}</div>new
                </div>
                <div className="rounded-lg bg-amber-50 p-3">
                  <div className="text-2xl font-semibold text-amber-800">{plan.updates.length}</div>updated
                </div>
                <div className="rounded-lg bg-neutral-50 p-3">
                  <div className="text-2xl font-semibold text-neutral-700">{plan.unchanged}</div>unchanged
                </div>
                <div className="rounded-lg bg-neutral-50 p-3">
                  <div className="text-2xl font-semibold text-neutral-700">{plan.duplicates.length + plan.errors.length}</div>
                  skipped
                </div>
              </div>
              <p className="text-xs text-neutral-500">
                Updates keep each script&apos;s previous version in the library. Nothing is deleted, and rows whose script text
                already exists aren&apos;t added twice.
              </p>

              {plan.updates.length > 0 && (
                <section>
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Updated</h4>
                  <ul className="space-y-1.5 text-xs">
                    {plan.updates.slice(0, 50).map((u) => (
                      <li key={u.id}>
                        <strong>
                          DAY {u.day} {u.title}
                        </strong>
                        {u.before.script !== u.script ? (
                          <>
                            <span className="block text-neutral-400 line-through">{oneLine(u.before.script)}</span>
                            <span className="block text-neutral-800">{oneLine(u.script)}</span>
                          </>
                        ) : (
                          <span className="block text-neutral-500">
                            {u.before.day !== u.day ? `day ${u.before.day} → ${u.day} ` : ''}
                            {u.before.title !== u.title ? `title “${u.before.title}” → “${u.title}”` : ''}
                          </span>
                        )}
                      </li>
                    ))}
                    {plan.updates.length > 50 && <li className="text-neutral-500">…and {plan.updates.length - 50} more</li>}
                  </ul>
                </section>
              )}
              {plan.creates.length > 0 && (
                <section>
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">New</h4>
                  <ul className="space-y-1 text-xs">
                    {plan.creates.slice(0, 50).map((c, i) => (
                      <li key={i}>
                        <strong>
                          DAY {c.day} {c.title}
                        </strong>{' '}
                        — {oneLine(c.script)}
                      </li>
                    ))}
                    {plan.creates.length > 50 && <li className="text-neutral-500">…and {plan.creates.length - 50} more</li>}
                  </ul>
                </section>
              )}
              {(plan.duplicates.length > 0 || plan.errors.length > 0) && (
                <section>
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Skipped</h4>
                  <ul className="space-y-1 text-xs text-neutral-600">
                    {plan.duplicates.slice(0, 20).map((d, i) => (
                      <li key={`d${i}`}>
                        DAY {d.day} {d.title}: already in the library
                      </li>
                    ))}
                    {plan.errors.slice(0, 20).map((e, i) => (
                      <li key={`e${i}`}>{e}</li>
                    ))}
                  </ul>
                </section>
              )}

              {progress && (
                <Progress
                  aria-label="Import progress"
                  value={progress.total ? (progress.done / progress.total) * 100 : 100}
                  label={`${progress.done} of ${progress.total}`}
                  showValueLabel
                  size="sm"
                />
              )}
              {result && (
                <p className="text-sm" data-testid="import-result">
                  Added {result.created}, updated {result.updated}.
                  {result.failed.length > 0 && <span className="block text-red-600">Failed: {result.failed.join('; ')}</span>}
                </p>
              )}
            </ModalBody>
            <ModalFooter>
              <button type="button" className={ghostClass} onClick={close} disabled={busy}>
                {result ? 'Done' : 'Cancel'}
              </button>
              {!result && (
                <button
                  type="button"
                  className={buttonClass}
                  disabled={busy || changes === 0}
                  data-testid="confirm-import"
                  onClick={async () => {
                    setProgress({ done: 0, total: changes });
                    setResult(await onConfirm(plan, (done, total) => setProgress({ done, total })));
                  }}
                >
                  {changes === 0 ? 'Nothing to import' : `Import ${changes} change${changes === 1 ? '' : 's'}`}
                </button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
