"use client";

import * as React from "react";
import { MapPin, Truck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatShortDate } from "@/lib/utils/dates";
import { formatINR } from "@/lib/utils/money";
import type { PincodeQuote } from "@/lib/pincode/service";
import { cn } from "@/lib/utils/cn";

export const PINCODE_STORAGE_KEY = "glam_pincode";

function readStoredPincode(): string {
  try {
    return localStorage.getItem(PINCODE_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function StockIndicator({ stock }: { stock: number }) {
  if (stock <= 0) return <p className="text-sm font-semibold text-error">Out of Stock</p>;
  if (stock <= 3) return <p className="text-sm font-semibold text-warning">Only {stock} left!</p>;
  return <p className="text-sm font-semibold text-success">In Stock</p>;
}

/** PDP delivery check (PRD §8.5.5). Prefills from localStorage and auto-checks a stored pincode. */
export function PincodeCheck({ stock, className }: { stock: number; className?: string }) {
  const [pin, setPin] = React.useState("");
  const [quote, setQuote] = React.useState<PincodeQuote | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [checkedPin, setCheckedPin] = React.useState<string | null>(null);

  const check = React.useCallback(async (value: string) => {
    if (!/^\d{6}$/.test(value)) {
      setError("Enter a valid 6-digit pincode");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pincode/${value}`);
      if (res.ok) {
        setQuote((await res.json()) as PincodeQuote);
        setCheckedPin(value);
        try {
          localStorage.setItem(PINCODE_STORAGE_KEY, value);
        } catch {}
      } else {
        const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        setQuote(null);
        setCheckedPin(value);
        setError(data?.error?.message ?? "Sorry, we don't deliver to this pincode yet.");
      }
    } catch {
      setError("Couldn't check delivery. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const stored = readStoredPincode();
    if (stored) {
      // Prefill after hydration; a stored pincode is checked automatically.
      const t = window.setTimeout(() => {
        setPin(stored);
        void check(stored);
      }, 0);
      return () => window.clearTimeout(t);
    }
  }, [check]);

  const sameDayOpen = quote?.sameDay && !quote.sameDayCutoffPassed;
  const earliest = quote ? (quote.estimates.same_day ?? quote.estimates.next_day ?? quote.estimates.standard) : null;

  return (
    <section className={cn("rounded-card border border-border p-4", className)} aria-labelledby="delivery-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="delivery-heading" className="flex items-center gap-2 text-sm font-semibold text-text">
          <Truck className="h-4 w-4 text-text-tertiary" aria-hidden /> Delivery &amp; stock
        </h2>
        <StockIndicator stock={stock} />
      </div>
      <form
        className="flex items-start gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void check(pin);
        }}
      >
        <Input
          aria-label="Pincode"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="Enter pincode"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          leading={<MapPin className="h-4 w-4" aria-hidden />}
          error={error ?? undefined}
          className="flex-1"
        />
        <Button type="submit" variant="outline" loading={loading} className="shrink-0">
          {checkedPin && checkedPin === pin ? "Change" : "Check"}
        </Button>
      </form>
      {quote && earliest && (
        <div className="mt-3 space-y-1.5 text-sm" aria-live="polite">
          <p className="text-text">
            Delivery to <span className="font-semibold">{quote.city}</span> by <span className="font-semibold">{formatShortDate(earliest)}</span>
          </p>
          <p className="text-text-secondary">
            {quote.courier} · {quote.fee === 0 ? <span className="font-semibold text-success">Free delivery</span> : <>Delivery fee {formatINR(quote.fee)}</>}
            {quote.fee > 0 && <span className="text-text-tertiary"> · Free above ₹999</span>}
          </p>
          {sameDayOpen && (
            <p className="flex items-center gap-1 font-semibold text-secondary">
              <Zap className="h-4 w-4" aria-hidden /> Same-Day Delivery available before 12 PM
            </p>
          )}
          {!quote.codAvailable && <p className="text-text-tertiary">Cash on Delivery not available for this pincode.</p>}
        </div>
      )}
    </section>
  );
}
