"use client";

import { useCallback, useSyncExternalStore } from "react";

export type PlpLayout = "grid" | "list";

const KEY = "glam_plp_layout";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function read(): PlpLayout {
  try {
    return sessionStorage.getItem(KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

/** 2-column grid vs 1-column list preference, persisted in sessionStorage (PRD §8.4). */
export function useLayoutPref(): [PlpLayout, (next: PlpLayout) => void] {
  const value = useSyncExternalStore(subscribe, read, () => "grid" as PlpLayout);
  const set = useCallback((next: PlpLayout) => {
    try {
      sessionStorage.setItem(KEY, next);
    } catch {}
    listeners.forEach((l) => l());
  }, []);
  return [value, set];
}
