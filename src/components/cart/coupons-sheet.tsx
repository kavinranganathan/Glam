"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet } from "@/components/ui/sheet";
import { LineSkeleton } from "@/components/ui/skeleton";
import type { AvailableCouponView } from "@/lib/cart/types";
import type { PaymentMethod } from "@/lib/pricing/types";
import { formatShortDate } from "@/lib/utils/dates";
import { formatINR } from "@/lib/utils/money";

export function CouponsSheet({
  open,
  session,
  onClose,
  onApply,
  pincode,
  paymentMethod,
}: {
  open: boolean;
  /** Bumped by the parent each time the sheet opens so a reopen refetches. */
  session: number;
  onClose: () => void;
  /** Resolves true when the coupon was applied (sheet closes). */
  onApply: (code: string) => Promise<boolean>;
  pincode?: string | null;
  paymentMethod?: PaymentMethod | null;
}) {
  // Results are keyed by the request they answer, so reopening or changing context never shows stale data.
  const requestKey = open ? `${session}|${pincode ?? ""}|${paymentMethod ?? ""}` : null;
  const [loaded, setLoaded] = React.useState<{ key: string; coupons: AvailableCouponView[] | null; error: string | null } | null>(null);
  const [applying, setApplying] = React.useState<string | null>(null);
  const current = loaded && loaded.key === requestKey ? loaded : null;
  const coupons = current?.coupons ?? null;
  const error = current?.error ?? null;

  React.useEffect(() => {
    if (!requestKey) return;
    let cancelled = false;
    const params = new URLSearchParams();
    if (pincode) params.set("pincode", pincode);
    if (paymentMethod) params.set("payment_method", paymentMethod);
    fetch(`/api/coupons/available?${params}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { coupons: AvailableCouponView[] };
        if (!cancelled) setLoaded({ key: requestKey, coupons: data.coupons, error: null });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ key: requestKey, coupons: null, error: "Couldn't load coupons. Please try again." });
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey, pincode, paymentMethod]);

  const apply = async (code: string) => {
    setApplying(code);
    const ok = await onApply(code);
    setApplying(null);
    if (ok) onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Available coupons" desktop="side">
      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : !coupons ? (
        <LineSkeleton lines={6} />
      ) : coupons.length === 0 ? (
        <p className="text-sm text-text-secondary">No coupons right now. Check back soon!</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {coupons.map((c) => (
            <li key={c.code} className="rounded-card border border-dashed border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-surface px-2 py-0.5 font-mono text-sm font-bold tracking-wide text-text">{c.code}</span>
                    {c.proOnly && <Badge tone="secondary">Pro only</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">{c.description}</p>
                  <p className="mt-1 text-xs text-text-tertiary">
                    {c.minOrder > 0 ? `Min order ${formatINR(c.minOrder)}` : "No minimum"}
                    {c.maxDiscount ? ` · Up to ${formatINR(c.maxDiscount)}` : ""}
                    {c.endsAt ? ` · Ends ${formatShortDate(c.endsAt)}` : ""}
                  </p>
                  {!c.eligible && c.reason && <p className="mt-1 text-xs font-medium text-warning">{c.reason}</p>}
                </div>
                <Button size="sm" variant={c.eligible ? "primary" : "outline"} disabled={!c.eligible} loading={applying === c.code} onClick={() => void apply(c.code)}>
                  Apply
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
