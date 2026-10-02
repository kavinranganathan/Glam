import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface Column<Row> {
  key: string;
  header: React.ReactNode;
  render: (row: Row) => React.ReactNode;
  className?: string;
  /** Right-align numeric columns. */
  align?: "left" | "right";
}

/** Dense, scrollable admin table. Server-safe (no hooks). */
export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  caption,
  empty = "Nothing here yet.",
  className,
}: {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  caption?: string;
  empty?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto rounded-card border border-border bg-background", className)}>
      <table className="w-full min-w-[640px] text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-surface text-left text-xs uppercase tracking-wide text-text-tertiary">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn("px-3 py-2 font-semibold", c.align === "right" && "text-right", c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-text-tertiary">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="align-top hover:bg-surface/60">
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-3 py-2", c.align === "right" && "text-right tabular-nums", c.className)}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">{title}</h1>
        {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Label/value pairs for detail panels. */
export function DefinitionList({ items, className }: { items: Array<{ label: string; value: React.ReactNode }>; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-sm", className)}>
      {items.map((it) => (
        <React.Fragment key={it.label}>
          <dt className="text-text-tertiary">{it.label}</dt>
          <dd className="min-w-0 break-words text-text">{it.value ?? "—"}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
