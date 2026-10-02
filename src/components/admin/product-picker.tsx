"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ListResult, ProductCard } from "@/lib/catalogue/types";
import { formatINR } from "@/lib/utils/money";

/** Searches GET /api/products?q=… and lets the admin pick products (used by flash sales). */
export function ProductPicker({ onPick, excludeIds = [] }: { onPick: (p: ProductCard) => void; excludeIds?: string[] }) {
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<{ term: string; items: ProductCard[] }>({ term: "", items: [] });
  const [loading, setLoading] = React.useState(false);
  const listId = React.useId();
  const term = q.trim();

  React.useEffect(() => {
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(term)}&pageSize=8`, { signal: ctrl.signal });
        if (res.ok) {
          const data = (await res.json()) as ListResult;
          setResults({ term, items: data.items });
        }
      } catch {
        /* aborted or offline — keep previous results */
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [term]);

  const visible = term.length >= 2 && results.term === term ? results.items.filter((p) => !excludeIds.includes(p.id)) : [];

  return (
    <div className="flex flex-col gap-2">
      <Input
        label="Add products"
        placeholder="Search by name…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        leading={<Search className="h-4 w-4" aria-hidden />}
        aria-controls={listId}
        aria-expanded={visible.length > 0}
        autoComplete="off"
      />
      <ul id={listId} role="listbox" aria-label="Search results" aria-busy={loading} className="max-h-56 divide-y divide-border overflow-y-auto rounded-card border border-border">
        {term.length >= 2 && !loading && visible.length === 0 && <li className="px-3 py-2 text-sm text-text-tertiary">No matching products.</li>}
        {visible.map((p) => (
          <li key={p.id} role="option" aria-selected={false}>
            <button
              type="button"
              onClick={() => {
                onPick(p);
                setQ("");
              }}
              className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- small thumbnail from the catalogue */}
              <img src={p.image} alt="" className="h-9 w-9 rounded object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{p.name}</span>
                <span className="block text-xs text-text-tertiary">
                  {p.brand.name} · {formatINR(p.price)}
                </span>
              </span>
              <span className="text-xs font-semibold text-primary">Add</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
