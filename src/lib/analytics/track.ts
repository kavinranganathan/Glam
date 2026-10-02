"use client";

import type { AnalyticsEvent, AnalyticsProps } from "./events";

const queue: Array<{ name: AnalyticsEvent; props: AnalyticsProps; ts: number }> = [];
let timer: number | null = null;

function flush() {
  if (!queue.length) return;
  const batch = queue.splice(0, queue.length);
  const body = JSON.stringify({ events: batch });
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
  } else {
    void fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  }
}

/** Client-side event capture, batched and sent with sendBeacon (PRD §10.2). */
export function track(name: AnalyticsEvent, props: AnalyticsProps = {}) {
  if (typeof window === "undefined") return;
  queue.push({ name, props, ts: Date.now() });
  if (timer) window.clearTimeout(timer);
  timer = window.setTimeout(flush, 1500);
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}
