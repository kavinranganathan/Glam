"use client";

import { Check, Clock, Zap } from "lucide-react";
import type { SlotOption } from "@/lib/orders/types";
import type { DeliverySlot } from "@/lib/pricing/delivery";
import { cn } from "@/lib/utils/cn";
import { formatShortDate } from "@/lib/utils/dates";
import { formatINR } from "@/lib/utils/money";

const LABEL: Record<DeliverySlot, { title: string; hint: string }> = {
  standard: { title: "Standard delivery", hint: "Our regular courier service" },
  next_day: { title: "Next-day delivery", hint: "Arrives tomorrow" },
  same_day: { title: "Same-day delivery", hint: "Order before 12 PM" },
};

export function SlotPicker({
  slots,
  value,
  onChange,
  sameDayCutoffPassed,
  disabled,
}: {
  slots: SlotOption[];
  value: DeliverySlot;
  onChange: (slot: DeliverySlot) => void;
  sameDayCutoffPassed?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <div role="radiogroup" aria-label="Delivery slot" className="flex flex-col gap-2">
        {slots.map((s) => {
          const selected = s.slot === value;
          const meta = LABEL[s.slot];
          return (
            <button
              key={s.slot}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(s.slot)}
              className={cn("flex w-full items-center gap-3 rounded-card border p-4 text-left transition-colors", selected ? "border-primary bg-primary-soft/40 ring-2 ring-primary/20" : "border-border hover:bg-surface")}
            >
              <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", selected ? "border-primary bg-primary text-white" : "border-border text-transparent")} aria-hidden>
                <Check className="h-3 w-3" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-semibold text-text">
                  {s.slot === "same_day" ? <Zap className="h-4 w-4 text-warning" aria-hidden /> : <Clock className="h-4 w-4 text-text-tertiary" aria-hidden />}
                  {meta.title}
                </span>
                <span className="block text-sm text-text-secondary">
                  Get it by <span className="font-medium text-text">{formatShortDate(s.estimatedDelivery)}</span> · {meta.hint}
                </span>
              </span>
              <span className={cn("shrink-0 text-sm font-semibold", s.surcharge === 0 ? "text-success" : "text-text")}>{s.surcharge === 0 ? "Free" : `+${formatINR(s.surcharge)}`}</span>
            </button>
          );
        })}
      </div>
      {sameDayCutoffPassed && <p className="mt-2 text-xs text-text-tertiary">Same-day delivery is available for this pincode on orders placed before 12 PM IST.</p>}
    </div>
  );
}
