"use client";

import { useCallback, useSyncExternalStore } from "react";

export const PINCODE_STORAGE_KEY = "glam_pincode";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function read(): string | null {
  try {
    const v = localStorage.getItem(PINCODE_STORAGE_KEY);
    return v && /^\d{6}$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

/** Shopper's delivery pincode remembered in localStorage (server snapshot: none). */
export function usePincode(): [string | null, (pincode: string | null) => void] {
  const value = useSyncExternalStore(subscribe, read, () => null);
  const set = useCallback((pincode: string | null) => {
    try {
      if (pincode) localStorage.setItem(PINCODE_STORAGE_KEY, pincode);
      else localStorage.removeItem(PINCODE_STORAGE_KEY);
    } catch {}
    listeners.forEach((l) => l());
  }, []);
  return [value, set];
}
