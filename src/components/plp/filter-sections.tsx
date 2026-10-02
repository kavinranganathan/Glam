"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Checkbox } from "@/components/ui/input";
import { Chip } from "@/components/ui/chip";
import type { FacetOption } from "@/lib/catalogue/types";
import { cn } from "@/lib/utils/cn";

export const PRICE_MIN_RUPEES = 0;
export const PRICE_MAX_RUPEES = 20000;
const PRICE_STEP = 100;

/** Multi-select brand list with an inline search box. */
export function BrandSection({ options, selected, onToggle }: { options: FacetOption[]; selected: string[]; onToggle: (slug: string) => void }) {
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  return (
    <div className="flex flex-col gap-2">
      <label className="flex h-10 items-center gap-2 rounded-input border border-border bg-background px-3 focus-within:ring-2 focus-within:ring-primary/40">
        <Search className="h-4 w-4 text-text-tertiary" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search brands"
          aria-label="Search brands"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </label>
      <ul className="max-h-56 overflow-y-auto pr-1">
        {shown.map((o) => (
          <li key={o.value}>
            <Checkbox
              className="min-h-11 items-center"
              checked={selected.includes(o.value)}
              onChange={() => onToggle(o.value)}
              label={
                <span className="flex items-center gap-2">
                  {o.label} <span className="text-xs text-text-tertiary">({o.count})</span>
                </span>
              }
            />
          </li>
        ))}
        {shown.length === 0 && <li className="py-2 text-sm text-text-tertiary">No brands match “{query}”.</li>}
      </ul>
    </div>
  );
}

/** Dual range slider plus numeric inputs, in rupees. Commits on release / blur / Enter. */
export function PriceSection({ min, max, onCommit }: { min?: number; max?: number; onCommit: (lo?: number, hi?: number) => void }) {
  const [lo, setLo] = React.useState(min ?? PRICE_MIN_RUPEES);
  const [hi, setHi] = React.useState(max ?? PRICE_MAX_RUPEES);
  const commit = () => {
    const l = Math.max(PRICE_MIN_RUPEES, Math.min(lo, hi));
    const h = Math.min(PRICE_MAX_RUPEES, Math.max(lo, hi));
    onCommit(l > PRICE_MIN_RUPEES ? l : undefined, h < PRICE_MAX_RUPEES ? h : undefined);
  };
  const pct = (v: number) => ((v - PRICE_MIN_RUPEES) / (PRICE_MAX_RUPEES - PRICE_MIN_RUPEES)) * 100;
  const onKey = (e: React.KeyboardEvent) => e.key === "Enter" && commit();
  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-11">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-border" aria-hidden />
        <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary" style={{ left: `${pct(Math.min(lo, hi))}%`, right: `${100 - pct(Math.max(lo, hi))}%` }} aria-hidden />
        {(["lo", "hi"] as const).map((which) => (
          <input
            key={which}
            type="range"
            min={PRICE_MIN_RUPEES}
            max={PRICE_MAX_RUPEES}
            step={PRICE_STEP}
            value={which === "lo" ? lo : hi}
            aria-label={which === "lo" ? "Minimum price" : "Maximum price"}
            onChange={(e) => (which === "lo" ? setLo(Number(e.target.value)) : setHi(Number(e.target.value)))}
            onPointerUp={commit}
            onKeyUp={commit}
            className="pointer-events-none absolute inset-0 h-11 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-white [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-white"
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <label className="flex flex-1 items-center gap-1 rounded-input border border-border px-2 h-11 text-sm">
          <span className="text-text-tertiary">₹</span>
          <input type="number" inputMode="numeric" min={PRICE_MIN_RUPEES} max={PRICE_MAX_RUPEES} value={lo} aria-label="Minimum price in rupees" onChange={(e) => setLo(Number(e.target.value))} onBlur={commit} onKeyDown={onKey} className="w-full bg-transparent outline-none" />
        </label>
        <span className="text-text-tertiary">to</span>
        <label className="flex flex-1 items-center gap-1 rounded-input border border-border px-2 h-11 text-sm">
          <span className="text-text-tertiary">₹</span>
          <input type="number" inputMode="numeric" min={PRICE_MIN_RUPEES} max={PRICE_MAX_RUPEES} value={hi} aria-label="Maximum price in rupees" onChange={(e) => setHi(Number(e.target.value))} onBlur={commit} onKeyDown={onKey} className="w-full bg-transparent outline-none" />
        </label>
      </div>
    </div>
  );
}

/** Single-select rendered as a radio group of chips. */
export function SingleSelect<T extends string | number>({ name, options, value, onChange }: { name: string; options: Array<{ value: T; label: string }>; value: T | undefined; onChange: (v: T | undefined) => void }) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Chip key={String(o.value)} role="radio" aria-checked={active} selected={active} onClick={() => onChange(active ? undefined : o.value)}>
            {o.label}
          </Chip>
        );
      })}
    </div>
  );
}

/** Multi-select chip row for array facets. */
export function ChipSection({ options, selected, onToggle, format }: { options: FacetOption[]; selected: string[]; onToggle: (v: string) => void; format?: (label: string) => string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Chip key={o.value} selected={selected.includes(o.value)} onClick={() => onToggle(o.value)}>
          {format ? format(o.label) : o.label} <span className="text-xs opacity-70">({o.count})</span>
        </Chip>
      ))}
    </div>
  );
}

/** Colour swatches; only rendered when a `shades` facet is present. */
export function ShadeSection({ options, selected, onToggle }: { options: FacetOption[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((o) => {
        const active = selected.includes(o.value);
        return (
          <button key={o.value} type="button" aria-pressed={active} aria-label={o.label} title={o.label} onClick={() => onToggle(o.value)} className={cn("flex h-11 w-11 items-center justify-center rounded-full border-2 transition", active ? "border-primary" : "border-transparent hover:border-border")}>
            <span className="h-8 w-8 rounded-full border border-border" style={{ backgroundColor: o.hex ?? "#e5e7eb" }} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
