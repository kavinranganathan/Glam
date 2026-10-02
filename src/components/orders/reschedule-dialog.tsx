"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";
import { formatShortDate } from "@/lib/utils/dates";

export function RescheduleDialog({
  open,
  onClose,
  dates,
  onConfirm,
  busy,
  error,
}: {
  open: boolean;
  onClose: () => void;
  /** YYYY-MM-DD options from the server (next 3 days). */
  dates: string[];
  onConfirm: (date: string) => void;
  busy: boolean;
  error: string | null;
}) {
  const [date, setDate] = React.useState<string>("");
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Reschedule delivery"
      description="Pick a day that works for you. Our courier will try again between 9 AM and 9 PM."
      actions={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Not now
          </Button>
          <Button onClick={() => onConfirm(date)} loading={busy} disabled={!date}>
            Confirm date
          </Button>
        </>
      }
    >
      <fieldset>
        <legend className="sr-only">Delivery date</legend>
        <div className="grid grid-cols-3 gap-2">
          {dates.map((d) => {
            const selected = d === date;
            return (
              <label
                key={d}
                className={cn(
                  "flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-card border px-2 py-2 text-center text-sm transition-colors",
                  selected ? "border-primary bg-primary-soft text-primary" : "border-border hover:border-text-tertiary",
                )}
              >
                <input type="radio" name="reschedule-date" value={d} checked={selected} onChange={() => setDate(d)} className="sr-only" />
                <span className="font-semibold">{formatShortDate(new Date(`${d}T12:00:00+05:30`))}</span>
              </label>
            );
          })}
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-error">
            {error}
          </p>
        )}
      </fieldset>
    </Dialog>
  );
}
