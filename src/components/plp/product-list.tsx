"use client";

import * as React from "react";
import { ArrowUp, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { ProductGrid } from "@/components/product/shelf";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { GridSkeleton } from "@/components/ui/skeleton";
import { track } from "@/lib/analytics/track";
import { DEFAULT_PAGE_SIZE, filtersToSearchParams } from "@/lib/catalogue/search";
import type { ListFilters, ListResult, ProductCard } from "@/lib/catalogue/types";
import { formatCount } from "./params";
import { useLayoutPref } from "./use-layout-pref";

type Status = "idle" | "loading" | "error";

interface State {
  items: ProductCard[];
  total: number;
  page: number;
  status: Status;
  /** True once page 1 has loaded (from props or network). */
  ready: boolean;
}

async function fetchPage(filters: ListFilters, page: number, signal: AbortSignal): Promise<ListResult> {
  const sp = filtersToSearchParams({ ...filters, page, pageSize: DEFAULT_PAGE_SIZE });
  const res = await fetch(`/api/products?${sp.toString()}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as ListResult;
}

function merge(prev: ProductCard[], next: ProductCard[]): ProductCard[] {
  const seen = new Set(prev.map((p) => p.id));
  return [...prev, ...next.filter((p) => !seen.has(p.id))];
}

/**
 * Infinite-scrolling product list (PRD §8.4): 24 per batch from GET /api/products, sentinel at
 * ~80% of the viewport, skeleton while loading, scroll-to-top FAB after 3 viewport heights.
 * Remount (via `key`) when filters change.
 */
export function ProductList({
  initial,
  filters,
  shelfKey,
  emptyState,
}: {
  initial?: ListResult;
  filters: ListFilters;
  shelfKey?: string;
  emptyState?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [layout] = useLayoutPref();
  const [state, setState] = React.useState<State>(() =>
    initial
      ? { items: initial.items, total: initial.total, page: initial.page, status: "idle", ready: true }
      : { items: [], total: 0, page: 0, status: "loading", ready: false },
  );
  const [showTop, setShowTop] = React.useState(false);
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const done = state.ready && state.items.length >= state.total;

  /** Fires the request; state updates happen only in the promise callbacks. */
  const request = React.useCallback(
    (page: number) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      fetchPage(filters, page, ctrl.signal)
        .then((r) =>
          setState((s) => ({ items: merge(s.items, r.items), total: r.total, page: r.page, status: "idle", ready: true })),
        )
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === "AbortError") return;
          setState((s) => ({ ...s, status: "error" }));
        });
    },
    [filters],
  );

  const load = React.useCallback(
    (page: number) => {
      setState((s) => ({ ...s, status: "loading" }));
      request(page);
    },
    [request],
  );

  // First page when none was server-rendered (brand tabs). Initial state is already "loading".
  React.useEffect(() => {
    if (!initial) request(1);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Infinite scroll sentinel.
  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el || done || state.status !== "idle") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((en) => en.isIntersecting)) load(state.page + 1);
      },
      { rootMargin: "0px 0px 20% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [done, state.status, state.page, load]);

  // Scroll-to-top FAB.
  React.useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > window.innerHeight * 3);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // search_performed on results mount.
  const initialTotal = initial?.total ?? 0;
  React.useEffect(() => {
    if (filters.q) track("search_performed", { query: filters.q, result_count: initialTotal, path: pathname });
  }, [filters.q, initialTotal, pathname]);

  if (state.ready && state.total === 0) {
    return (
      <>
        {emptyState ?? (
          <EmptyState
            icon={<Search className="h-7 w-7" aria-hidden />}
            title="No products match these filters"
            description="Try removing a filter or two to see more products."
            action={{ label: "Clear filters", href: pathname }}
          />
        )}
      </>
    );
  }

  return (
    <div className="relative">
      {state.items.length > 0 && <ProductGrid items={state.items} layout={layout} shelfKey={shelfKey} />}

      {state.status === "loading" && (
        <div className={state.items.length ? "mt-3" : ""} aria-busy="true" aria-label="Loading products">
          <GridSkeleton count={state.items.length ? 4 : 8} />
        </div>
      )}

      {state.status === "error" && (
        <div className="flex flex-col items-center gap-2 py-6 text-center" role="alert">
          <p className="text-sm text-text-secondary">Couldn’t load more products.</p>
          <Button variant="outline" size="sm" onClick={() => load(state.ready ? state.page + 1 : 1)}>
            Retry
          </Button>
        </div>
      )}

      {!done && <div ref={sentinelRef} className="h-px" aria-hidden />}

      {done && state.items.length > 0 && (
        <p className="py-8 text-center text-sm text-text-tertiary">
          You’ve seen all {formatCount(state.total)} {state.total === 1 ? "product" : "products"}
        </p>
      )}

      {showTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className="fixed bottom-20 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-text text-white shadow-lg transition hover:bg-text-secondary md:bottom-6 animate-fade-up"
        >
          <ArrowUp className="h-5 w-5" aria-hidden />
        </button>
      )}
    </div>
  );
}
