"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Zap } from "lucide-react";
import { countdownParts } from "@/lib/utils/dates";

function subscribe(cb: () => void) {
  const id = window.setInterval(cb, 1000);
  return () => window.clearInterval(id);
}
/** Current time rounded to the second; 0 on the server so SSR and hydration agree. */
function useNowSeconds(): number {
  return React.useSyncExternalStore(subscribe, () => Math.floor(Date.now() / 1000) * 1000, () => 0);
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Flash sale strip (PRD §8.2.2 #8): live DD:HH:MM:SS countdown, products passed as children,
 * CTA to /flash-sale. Renders nothing once the sale has ended.
 */
export function FlashSaleStrip({ name, endsAt, children }: { name: string; endsAt: string; children: React.ReactNode }) {
  const now = useNowSeconds();
  const live = now > 0;
  // Before hydration `now` is 0: show placeholders rather than reading the clock during render.
  const parts = live ? countdownParts(endsAt, new Date(now)) : { total: 1, days: 0, hours: 0, minutes: 0, seconds: 0 };
  if (live && parts.total <= 0) return null;

  const units: Array<[string, number]> = [
    ["Days", parts.days],
    ["Hrs", parts.hours],
    ["Min", parts.minutes],
    ["Sec", parts.seconds],
  ];

  return (
    <section aria-labelledby="flash-sale-title" className="mx-4 my-4 overflow-hidden rounded-card bg-gradient-to-r from-primary to-secondary p-4 text-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 fill-current" aria-hidden />
          <h2 id="flash-sale-title" className="font-display text-lg font-bold md:text-xl">
            {name}
          </h2>
        </div>
        <div role="timer" aria-live="off" aria-label="Sale ends in" className="flex items-center gap-1">
          <span className="sr-only">
            {live ? `${parts.days} days ${parts.hours} hours ${parts.minutes} minutes` : "Loading countdown"}
          </span>
          {units.map(([label, value], i) => (
            <React.Fragment key={label}>
              {i > 0 && (
                <span className="pb-4 font-bold" aria-hidden>
                  :
                </span>
              )}
              <span className="flex flex-col items-center" aria-hidden>
                <span className="min-w-9 rounded bg-white/15 px-1.5 py-1 text-center font-mono text-base font-bold tabular-nums">
                  {live ? pad(value) : "--"}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-white/80">{label}</span>
              </span>
            </React.Fragment>
          ))}
        </div>
        <Link href="/flash-sale" className="btn inline-flex h-11 items-center gap-1 rounded-pill bg-white px-4 text-sm font-semibold text-primary hover:bg-primary-soft">
          Shop the sale <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <div className="mt-4 -mx-4 -mb-4 bg-background px-4 py-3 text-text">{children}</div>
    </section>
  );
}
