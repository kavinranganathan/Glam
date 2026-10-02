"use client";

import * as React from "react";

interface WishlistState {
  has: (productId: string) => boolean;
  set: (productId: string, value: boolean) => void;
}

const Ctx = React.createContext<WishlistState | null>(null);

/** Client-side set of wishlisted product ids, seeded from the server so hearts render filled immediately. */
export function WishlistStateProvider({ initialIds, children }: { initialIds: string[]; children: React.ReactNode }) {
  const base = React.useMemo(() => new Set(initialIds), [initialIds]);
  const [overrides, setOverrides] = React.useState<Map<string, boolean>>(() => new Map());
  const value = React.useMemo<WishlistState>(
    () => ({
      has: (id) => overrides.get(id) ?? base.has(id),
      set: (id, v) =>
        setOverrides((prev) => {
          const next = new Map(prev);
          next.set(id, v);
          return next;
        }),
    }),
    [base, overrides],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const fallbackStore = { ids: new Set<string>(), listeners: new Set<() => void>() };

export function useWishlistState(): WishlistState {
  const ctx = React.useContext(Ctx);
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    if (ctx) return;
    fallbackStore.listeners.add(force);
    return () => {
      fallbackStore.listeners.delete(force);
    };
  }, [ctx]);
  if (ctx) return ctx;
  return {
    has: (id) => fallbackStore.ids.has(id),
    set: (id, v) => {
      if (v) fallbackStore.ids.add(id);
      else fallbackStore.ids.delete(id);
      fallbackStore.listeners.forEach((l) => l());
    },
  };
}
