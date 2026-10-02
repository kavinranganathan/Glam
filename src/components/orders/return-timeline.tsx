import { Check, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { RETURN_HAPPY_PATH, RETURN_STATUS_LABEL } from "@/lib/returns/policy";
import type { ReturnEventView, ReturnStatus } from "@/lib/orders/views";
import { formatDateTime } from "@/lib/utils/dates";

/** Return progress along RETURN_HAPPY_PATH; a rejected return shows a banner and freezes the track. */
export function ReturnTimeline({ status, events, className }: { status: ReturnStatus; events: ReturnEventView[]; className?: string }) {
  const rejected = status === "rejected";
  const reachedIdx = rejected
    ? Math.max(0, ...events.map((e) => RETURN_HAPPY_PATH.indexOf(e.status as (typeof RETURN_HAPPY_PATH)[number])).filter((i) => i >= 0))
    : RETURN_HAPPY_PATH.indexOf(status as (typeof RETURN_HAPPY_PATH)[number]);
  const lastEventFor = (s: string) => [...events].reverse().find((e) => e.status === s);
  const rejection = events.find((e) => e.status === "rejected");
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {rejected && (
        <div role="status" className="flex items-start gap-3 rounded-card border border-error/30 bg-error-soft p-3 text-sm text-error">
          <XCircle className="h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">{RETURN_STATUS_LABEL.rejected}</p>
            <p className="mt-0.5">{rejection?.note ?? "This return could not be accepted. Contact support if you think this is a mistake."}</p>
          </div>
        </div>
      )}
      <ol className="flex flex-col md:flex-row md:items-start md:justify-between" aria-label="Return progress">
        {RETURN_HAPPY_PATH.map((step, i) => {
          const done = reachedIdx > i || (reachedIdx === i && (status === "refunded" || rejected));
          const current = !rejected && reachedIdx === i && !done;
          const upcoming = reachedIdx < i;
          const ev = lastEventFor(step);
          return (
            <li key={step} className="relative flex gap-3 md:flex-1 md:flex-col md:items-center md:text-center">
              {i < RETURN_HAPPY_PATH.length - 1 && (
                <span
                  aria-hidden
                  className={cn("absolute left-[11px] top-6 h-[calc(100%-8px)] w-0.5 md:left-1/2 md:top-3 md:h-0.5 md:w-full", done ? "bg-success" : "bg-border")}
                />
              )}
              <span
                aria-hidden
                className={cn(
                  "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold",
                  done && "border-success bg-success text-white",
                  current && "border-primary bg-background text-primary ring-4 ring-primary/15",
                  (upcoming || (rejected && !done)) && "border-border bg-background text-text-tertiary",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <div className="pb-6 md:pb-0 md:pt-2">
                <p className={cn("text-sm font-semibold", upcoming ? "text-text-tertiary" : "text-text")}>
                  {RETURN_STATUS_LABEL[step]}
                  {current && <span className="sr-only"> (current)</span>}
                </p>
                {ev && <p className="text-xs text-text-tertiary">{formatDateTime(ev.at)}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
