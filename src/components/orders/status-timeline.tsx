import { Check, PackageX, RotateCcw, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { HAPPY_PATH, STATUS_LABEL, happyPathIndex, type OrderStatus } from "@/lib/orders/state-machine";
import type { OrderEventView } from "@/lib/orders/views";
import { formatDateTime } from "@/lib/utils/dates";

interface Props {
  status: OrderStatus;
  events: OrderEventView[];
  cancelReason?: string | null;
  className?: string;
}

/**
 * Happy-path progress (vertical on mobile, horizontal on desktop) with done / current / upcoming steps.
 * Exceptional states (cancelled, failed delivery, returns) render as a banner above the track.
 */
export function StatusTimeline({ status, events, cancelReason, className }: Props) {
  const idx = happyPathIndex(status);
  const banner = exceptionalBanner(status, cancelReason);
  const lastEventFor = (s: OrderStatus) => [...events].reverse().find((e) => e.status === s);
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {banner && (
        <div role="status" className={cn("flex items-start gap-3 rounded-card border p-3 text-sm", banner.className)}>
          {banner.icon}
          <div>
            <p className="font-semibold">{banner.title}</p>
            {banner.body && <p className="mt-0.5">{banner.body}</p>}
          </div>
        </div>
      )}
      <ol className="flex flex-col gap-0 md:flex-row md:items-start md:justify-between" aria-label="Order progress">
        {HAPPY_PATH.map((step, i) => {
          const done = idx > i || (idx === i && (status === "delivered" || idx === HAPPY_PATH.length - 1));
          const current = idx === i && !done;
          const upcoming = idx < i;
          const ev = lastEventFor(step);
          return (
            <li key={step} className="relative flex gap-3 md:flex-1 md:flex-col md:items-center md:text-center">
              {i < HAPPY_PATH.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[11px] top-6 h-[calc(100%-8px)] w-0.5 md:left-1/2 md:top-3 md:h-0.5 md:w-full",
                    done ? "bg-success" : "bg-border",
                  )}
                />
              )}
              <span
                aria-hidden
                className={cn(
                  "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold",
                  done && "border-success bg-success text-white",
                  current && "border-primary bg-background text-primary ring-4 ring-primary/15",
                  upcoming && "border-border bg-background text-text-tertiary",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <div className="pb-6 md:pb-0 md:pt-2">
                <p className={cn("text-sm font-semibold", upcoming ? "text-text-tertiary" : "text-text")}>
                  {STATUS_LABEL[step]}
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

function exceptionalBanner(status: OrderStatus, cancelReason?: string | null) {
  switch (status) {
    case "cancelled":
      return {
        title: "This order was cancelled",
        body: cancelReason ? `Reason: ${cancelReason}` : null,
        icon: <PackageX className="h-5 w-5 shrink-0" aria-hidden />,
        className: "border-error/30 bg-error-soft text-error",
      };
    case "failed_delivery":
      return {
        title: "Delivery attempted",
        body: "We could not reach you. Pick a new date below and we will try again.",
        icon: <TriangleAlert className="h-5 w-5 shrink-0" aria-hidden />,
        className: "border-warning/30 bg-warning-soft text-warning",
      };
    case "return_initiated":
      return {
        title: "Return requested",
        body: "Free pickup will be scheduled within 24 hours. Track it in the Returns section below.",
        icon: <RotateCcw className="h-5 w-5 shrink-0" aria-hidden />,
        className: "border-warning/30 bg-warning-soft text-warning",
      };
    case "returned":
      return {
        title: "Return complete",
        body: "Your refund is being processed.",
        icon: <RotateCcw className="h-5 w-5 shrink-0" aria-hidden />,
        className: "border-border bg-surface text-text-secondary",
      };
    case "refunded":
      return {
        title: "Refund processed",
        body: "The refund for this order has been issued.",
        icon: <Check className="h-5 w-5 shrink-0" aria-hidden />,
        className: "border-success/30 bg-success-soft text-success",
      };
    default:
      return null;
  }
}
