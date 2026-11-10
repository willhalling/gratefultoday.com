'use client';

import { ArrowDown, ArrowUp, ArchiveRestore } from 'lucide-react';
import { TableVirtuoso, type TableComponents } from 'react-virtuoso';

export type SortKey = 'day' | 'title' | 'status' | 'takes' | 'renders' | 'createdAt';

export interface TableRow {
  id: string;
  day: number;
  title: string;
  spoken: string;
  onScreen: string;
  /** needs voice / voiced / rendered / queued / rendering / failed / archived */
  status: string;
  takes: number;
  renders: number;
  latestRenderUrl: string | null;
  imageLabel: string;
  createdAt: string;
  archived: boolean;
}

const STATUS_STYLE: Record<string, string> = {
  'needs voice': 'bg-amber-100 text-amber-900',
  voiced: 'bg-neutral-100 text-neutral-800',
  rendered: 'bg-emerald-100 text-emerald-800',
  queued: 'bg-neutral-200 text-neutral-800',
  rendering: 'bg-neutral-900 text-white',
  failed: 'bg-red-100 text-red-800',
  archived: 'bg-neutral-100 text-neutral-400',
};

const COLUMNS: { key: SortKey | null; label: string; className: string }[] = [
  { key: 'day', label: 'Day', className: 'w-16' },
  { key: 'title', label: 'Title', className: 'w-40' },
  { key: null, label: 'Script (spoken)', className: 'min-w-[18rem]' },
  { key: null, label: 'On screen', className: 'min-w-[14rem]' },
  { key: 'status', label: 'Status', className: 'w-28' },
  { key: 'takes', label: 'Takes', className: 'w-16 text-right' },
  { key: 'renders', label: 'Renders', className: 'w-20 text-right' },
  { key: null, label: 'Image', className: 'w-36' },
  { key: 'createdAt', label: 'Added', className: 'w-28' },
];

interface TableContext {
  onOpen: (id: string) => void;
  selectedId: string | null;
}

// Defined once (not inline) so rows aren't remounted on every render.
const TABLE_COMPONENTS: TableComponents<TableRow, TableContext> = {
  Table: (props) => <table {...props} className="w-full border-collapse text-left text-sm" />,
  TableRow: ({ item, context, ...props }) => (
    <tr
      {...props}
      data-testid="table-row"
      onClick={() => !item.archived && context?.onOpen(item.id)}
      className={`border-b border-neutral-100 align-top ${item.archived ? 'text-neutral-400' : 'cursor-pointer hover:bg-neutral-50'} ${item.id === context?.selectedId ? 'bg-neutral-100' : ''}`}
    />
  ),
};

interface ScriptTableProps {
  rows: TableRow[];
  sort: { key: SortKey; dir: 'asc' | 'desc' };
  onSort: (key: SortKey) => void;
  onOpen: (id: string) => void;
  onRestore: (id: string) => void;
  selectedId: string | null;
}

/** Every script in one sortable, virtualized table (scrolls with the page). */
export default function ScriptTable({ rows, sort, onSort, onOpen, onRestore, selectedId }: ScriptTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white" data-testid="script-table">
      <TableVirtuoso<TableRow, TableContext>
        useWindowScroll
        context={{ onOpen, selectedId }}
        data={rows}
        initialItemCount={Math.min(40, rows.length)}
        increaseViewportBy={600}
        computeItemKey={(_, row) => row.id}
        components={TABLE_COMPONENTS}
        fixedHeaderContent={() => (
          <tr className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            {COLUMNS.map((c) => (
              <th key={c.label} className={`border-b border-neutral-200 px-3 py-2 font-semibold ${c.className}`}>
                {c.key ? (
                  <button type="button" className="inline-flex items-center gap-1 uppercase" onClick={() => onSort(c.key!)}>
                    {c.label}
                    {sort.key === c.key &&
                      (sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </button>
                ) : (
                  c.label
                )}
              </th>
            ))}
          </tr>
        )}
        itemContent={(_, row) => (
          <>
            <td className="px-3 py-2 tabular-nums">{String(row.day).padStart(2, '0')}</td>
            <td className="px-3 py-2 font-semibold uppercase">{row.title || '—'}</td>
            <td className="px-3 py-2">
              <span className="line-clamp-2">{row.spoken}</span>
            </td>
            <td className="px-3 py-2 font-mono text-xs text-neutral-600">
              <span className="line-clamp-2">{row.onScreen}</span>
            </td>
            <td className="px-3 py-2">
              {row.archived ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestore(row.id);
                  }}
                >
                  <ArchiveRestore className="h-3 w-3" /> Restore
                </button>
              ) : (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[row.status] ?? ''}`}>
                  {row.status}
                </span>
              )}
            </td>
            <td className="px-3 py-2 text-right tabular-nums">{row.takes}</td>
            <td className="px-3 py-2 text-right tabular-nums">
              {row.latestRenderUrl ? (
                <a
                  href={row.latestRenderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                  title="Download the latest render"
                  onClick={(e) => e.stopPropagation()}
                >
                  {row.renders}
                </a>
              ) : (
                row.renders
              )}
            </td>
            <td className="truncate px-3 py-2 text-xs text-neutral-500" title={row.imageLabel}>
              {row.imageLabel}
            </td>
            <td className="px-3 py-2 text-xs text-neutral-500">
              {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : ''}
            </td>
          </>
        )}
      />
    </div>
  );
}
