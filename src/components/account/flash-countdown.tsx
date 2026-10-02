"use client";

import * as React from "react";
import { countdownParts } from "@/lib/utils/dates";

/** Live countdown to `endsAt`. Ticks every second; announces politely for screen readers. */
export function FlashCountdown({ endsAt, onEnd }: { endsAt: string; onEnd?: () => void }) {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const parts = countdownParts(endsAt, now);
  React.useEffect(() => {
    if (parts.total === 0) onEnd?.();
  }, [parts.total, onEnd]);

  const cells: Array<[string, number]> = parts.days > 0 ? [["Days", parts.days], ["Hrs", parts.hours], ["Min", parts.minutes]] : [["Hrs", parts.hours], ["Min", parts.minutes], ["Sec", parts.seconds]];
  const label = parts.total === 0 ? "Sale has ended" : `Ends in ${parts.days ? `${parts.days} days ` : ""}${parts.hours} hours ${parts.minutes} minutes`;

  return (
    <div role="timer" aria-live="polite" aria-label={label} className="flex items-center gap-2">
      {cells.map(([unit, value]) => (
        <span key={unit} className="flex min-w-[3.5rem] flex-col items-center rounded-card bg-white/15 px-2 py-1.5 backdrop-blur">
          <span className="font-display text-2xl font-bold tabular-nums leading-none">{String(value).padStart(2, "0")}</span>
          <span className="mt-1 text-[10px] uppercase tracking-wide opacity-90">{unit}</span>
        </span>
      ))}
    </div>
  );
}
