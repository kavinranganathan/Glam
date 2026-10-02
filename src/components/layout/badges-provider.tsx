"use client";

import * as React from "react";

export interface Badges {
  cartCount: number;
  wishlistCount: number;
  unreadNotifications: number;
  isLoggedIn: boolean;
}

interface BadgesContextValue extends Badges {
  refresh: () => Promise<void>;
  setCartCount: (n: number) => void;
}

const BadgesContext = React.createContext<BadgesContextValue | null>(null);

const EMPTY: Badges = { cartCount: 0, wishlistCount: 0, unreadNotifications: 0, isLoggedIn: false };

export function BadgesProvider({ initial, children }: { initial?: Partial<Badges>; children: React.ReactNode }) {
  const [state, setState] = React.useState<Badges>({ ...EMPTY, ...initial });
  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch("/api/me/badges", { cache: "no-store" });
      if (res.ok) setState(await res.json());
    } catch {
      // keep previous counts
    }
  }, []);
  React.useEffect(() => {
    const t = window.setTimeout(() => void refresh(), 0);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);
  const setCartCount = React.useCallback((n: number) => setState((s) => ({ ...s, cartCount: n })), []);
  const value = React.useMemo(() => ({ ...state, refresh, setCartCount }), [state, refresh, setCartCount]);
  return <BadgesContext.Provider value={value}>{children}</BadgesContext.Provider>;
}

export function useBadges(): BadgesContextValue {
  const ctx = React.useContext(BadgesContext);
  if (!ctx) return { ...EMPTY, refresh: async () => {}, setCartCount: () => {} };
  return ctx;
}
