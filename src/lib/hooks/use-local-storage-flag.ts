"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/**
 * Boolean flag persisted in localStorage, safe for SSR (server snapshot = `serverDefault`).
 * Reads via useSyncExternalStore, so no setState-in-effect and no hydration mismatch.
 */
export function useLocalStorageFlag(key: string, serverDefault = true): [boolean, (v: boolean) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(key) === "1";
      } catch {
        return serverDefault;
      }
    },
    () => serverDefault,
  );
  const set = useCallback(
    (v: boolean) => {
      try {
        if (v) localStorage.setItem(key, "1");
        else localStorage.removeItem(key);
      } catch {}
      listeners.forEach((l) => l());
    },
    [key],
  );
  return [value, set];
}
