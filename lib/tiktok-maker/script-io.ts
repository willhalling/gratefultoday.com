/**
 * lib/tiktok-maker/script-io.ts — export the script library as CSV / JSON and
 * read those files back. Pure (no DOM, no network).
 *
 * Import matches rows to saved scripts by `id`; a row without a known id is a
 * new script. Only day, title and script are read — everything else in the
 * export (status, counts, lines…) is information, not input.
 */

export interface ExportRow {
  id: string;
  day: number;
  title: string;
  /** Voiceover text with [audio tags]. */
  script: string;
  /** What's spoken, tags removed. */
  spoken: string;
  /** On-screen typewriter lines, joined with " / ". */
  onScreen: string;
  status: string;
  takes: number;
  renders: number;
  latestRender: string;
  imageId: string;
  source: string;
  archived: boolean;
  createdAt: string;
}

export const EXPORT_COLUMNS: (keyof ExportRow)[] = [
  'id',
  'day',
  'title',
  'script',
  'spoken',
  'onScreen',
  'status',
  'takes',
  'renders',
  'latestRender',
  'imageId',
  'source',
  'archived',
  'createdAt',
];

export interface ImportRow {
  id: string | null;
  day: number;
  title: string;
  script: string;
}

// ─── CSV ─────────────────────────────────────────────────────────────────────

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** RFC 4180 CSV with a header row; CRLF line endings and a BOM so Excel reads UTF-8. */
export function toCsv(rows: ExportRow[]): string {
  const lines = [EXPORT_COLUMNS.join(','), ...rows.map((r) => EXPORT_COLUMNS.map((c) => csvCell(r[c])).join(','))];
  return `﻿${lines.join('\r\n')}\r\n`;
}

/** Parse RFC 4180 CSV (quoted fields may contain commas, quotes and newlines). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

// ─── Import ──────────────────────────────────────────────────────────────────

function toImportRow(raw: Record<string, unknown>, line: number, errors: string[]): ImportRow | null {
  const get = (k: string) => {
    const hit = Object.keys(raw).find((key) => key.trim().toLowerCase() === k.toLowerCase());
    return hit === undefined ? undefined : raw[hit];
  };
  const script = String(get('script') ?? '').replace(/\r\n/g, '\n').trim();
  if (!script) {
    errors.push(`Row ${line}: no script — skipped.`);
    return null;
  }
  const dayRaw = get('day');
  const day = Math.floor(Number(dayRaw));
  if (!Number.isFinite(day) || day < 1) {
    errors.push(`Row ${line}: day "${String(dayRaw ?? '')}" isn't a number — skipped.`);
    return null;
  }
  const id = String(get('id') ?? '').trim();
  return {
    id: /^[A-Za-z0-9]{1,64}$/.test(id) ? id : null,
    day,
    title: String(get('title') ?? '').trim().slice(0, 80),
    script: script.slice(0, 3000),
  };
}

/** Read an exported (or hand-made) CSV/JSON file: needs `day` and `script`; `id` and `title` optional. */
export function parseImport(text: string, fileName: string): { rows: ImportRow[]; errors: string[] } {
  const errors: string[] = [];
  const rows: ImportRow[] = [];
  const isJson = /\.json$/i.test(fileName) || /^\s*[[{]/.test(text);
  if (isJson) {
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return { rows, errors: ['Not valid JSON.'] };
    }
    const list = Array.isArray(data) ? data : Array.isArray((data as { scripts?: unknown })?.scripts) ? (data as { scripts: unknown[] }).scripts : null;
    if (!list) return { rows, errors: ['Expected an array of scripts (or { "scripts": [...] }).'] };
    list.forEach((item, i) => {
      if (item && typeof item === 'object') {
        const row = toImportRow(item as Record<string, unknown>, i + 1, errors);
        if (row) rows.push(row);
      } else errors.push(`Item ${i + 1}: not an object — skipped.`);
    });
    return { rows, errors };
  }
  const table = parseCsv(text);
  if (table.length < 2) return { rows, errors: ['The CSV has no rows under its header.'] };
  const header = table[0].map((h) => h.trim());
  if (!header.some((h) => h.toLowerCase() === 'script') || !header.some((h) => h.toLowerCase() === 'day')) {
    return { rows, errors: ['The CSV needs "day" and "script" columns.'] };
  }
  table.slice(1).forEach((cells, i) => {
    const raw: Record<string, string> = {};
    header.forEach((h, c) => (raw[h] = cells[c] ?? ''));
    const row = toImportRow(raw, i + 2, errors);
    if (row) rows.push(row);
  });
  return { rows, errors };
}

/** Trigger a browser download of text content. */
export function downloadText(content: string, fileName: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
