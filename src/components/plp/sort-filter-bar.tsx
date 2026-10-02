"use client";

import * as React from "react";
import { LayoutGrid, Loader2, SlidersHorizontal, StretchHorizontal } from "lucide-react";
import { activeFilterCount } from "@/lib/catalogue/search";
import type { Facets, ListFilters, SortKey } from "@/lib/catalogue/types";
import { cn } from "@/lib/utils/cn";
import { FilterPanel } from "./filter-panel";
import { SORT_OPTIONS, formatCount } from "./params";
import { useFilterNav } from "./use-filter-nav";
import { useLayoutPref } from "./use-layout-pref";

function isSortKey(v: string): v is SortKey {
  return SORT_OPTIONS.some((o) => o.value === v);
}

/** Sticky sort / filter / layout row (PRD §8.3.2, §8.4). URL is the source of truth for filters. */
export function SortFilterBar({ filters, facets, total }: { filters: ListFilters; facets: Facets; total: number }) {
  const { apply, pending } = useFilterNav();
  const [open, setOpen] = React.useState(false);
  const [layout, setLayout] = useLayoutPref();
  const count = activeFilterCount(filters);
  const sortId = React.useId();

  return (
    <>
      <div className="sticky top-14 z-30 -mx-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur md:top-16">
        <div className="mx-auto flex max-w-7xl items-center gap-2">
          <p className="mr-auto flex items-center gap-2 text-sm text-text-secondary" aria-live="polite">
            {pending && <Loader2 className="h-4 w-4 animate-spin text-primary" aria-label="Updating results" />}
            <span>
              <span className="font-semibold text-text">{formatCount(total)}</span> {total === 1 ? "result" : "results"}
            </span>
          </p>

          <label htmlFor={sortId} className="sr-only">
            Sort by
          </label>
          <select
            id={sortId}
            value={filters.sort ?? "relevance"}
            onChange={(e) => {
              const v = e.target.value;
              if (isSortKey(v)) apply({ ...filters, sort: v }, { facet: "sort", value: v });
            }}
            className="h-11 max-w-[11rem] rounded-pill border border-border bg-background px-3 text-sm font-medium text-text outline-none focus:ring-2 focus:ring-primary/40"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
            className={cn(
              "inline-flex h-11 items-center gap-1.5 rounded-pill border px-4 text-sm font-semibold transition-colors",
              count > 0 ? "border-primary bg-primary-soft text-primary" : "border-border bg-background text-text hover:bg-surface",
            )}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Filter
            {count > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-white" aria-label={`${count} active filters`}>
                {count}
              </span>
            )}
          </button>

          <div role="group" aria-label="Layout" className="flex items-center overflow-hidden rounded-pill border border-border">
            <button
              type="button"
              aria-pressed={layout === "grid"}
              aria-label="Grid view"
              onClick={() => setLayout("grid")}
              className={cn("flex h-11 w-11 items-center justify-center", layout === "grid" ? "bg-surface text-primary" : "text-text-tertiary hover:text-text")}
            >
              <LayoutGrid className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-pressed={layout === "list"}
              aria-label="List view"
              onClick={() => setLayout("list")}
              className={cn("flex h-11 w-11 items-center justify-center", layout === "list" ? "bg-surface text-primary" : "text-text-tertiary hover:text-text")}
            >
              <StretchHorizontal className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
      <FilterPanel open={open} onClose={() => setOpen(false)} filters={filters} facets={facets} total={total} />
    </>
  );
}
