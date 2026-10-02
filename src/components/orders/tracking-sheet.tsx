"use client";

import * as React from "react";
import { MapPin, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { STATUS_LABEL } from "@/lib/orders/state-machine";
import type { OrderEventView } from "@/lib/orders/views";
import { formatDateTime } from "@/lib/utils/dates";

/** Simulated courier tracking: the order's event log presented newest-first inside a sheet. */
export function TrackingSheet({
  orderNumber,
  courier,
  awb,
  events,
  estimatedDelivery,
  trigger = "button",
}: {
  orderNumber: string;
  courier: string | null;
  awb: string | null;
  events: OrderEventView[];
  estimatedDelivery: string | null;
  trigger?: "button" | "link";
}) {
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);
  const sorted = [...events].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return (
    <>
      {trigger === "button" ? (
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Truck className="h-4 w-4" aria-hidden /> Track
        </Button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-primary">
          Track
        </button>
      )}
      <Sheet open={open} onClose={close} title={`Tracking ${orderNumber}`} desktop="side">
        <div className="rounded-card border border-border bg-surface p-3 text-sm">
          <p className="flex items-center gap-2 font-semibold text-text">
            <Truck className="h-4 w-4 text-primary" aria-hidden /> {courier ?? "Courier to be assigned"}
          </p>
          {awb && (
            <p className="mt-1 text-text-secondary">
              AWB <span className="font-mono">{awb}</span>
            </p>
          )}
          {estimatedDelivery && <p className="mt-1 text-text-secondary">Expected by {formatDateTime(`${estimatedDelivery}T21:00:00+05:30`).replace(/,.*$/, "")}</p>}
        </div>
        <ol className="mt-4 space-y-4" aria-label="Tracking events">
          {sorted.map((e, i) => (
            <li key={`${e.at}-${i}`} className="relative flex gap-3 pl-1">
              <span className="relative mt-1 flex h-3 w-3 shrink-0">
                <span className={i === 0 ? "h-3 w-3 rounded-full bg-primary" : "h-3 w-3 rounded-full bg-border"} aria-hidden />
                {i < sorted.length - 1 && <span className="absolute left-[5px] top-3 h-[calc(100%+16px)] w-0.5 bg-border" aria-hidden />}
              </span>
              <div>
                <p className="text-sm font-semibold text-text">{e.note ?? STATUS_LABEL[e.status]}</p>
                <p className="text-xs text-text-tertiary">
                  {STATUS_LABEL[e.status]} · {formatDateTime(e.at)}
                </p>
              </div>
            </li>
          ))}
          {sorted.length === 0 && (
            <li className="flex items-center gap-2 text-sm text-text-tertiary">
              <MapPin className="h-4 w-4" aria-hidden /> No scans yet.
            </li>
          )}
        </ol>
      </Sheet>
    </>
  );
}
