"use client";

import * as React from "react";
import { TicketPercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useBadges } from "@/components/layout/badges-provider";
import { track } from "@/lib/analytics/track";
import type { CartView } from "@/lib/cart/types";
import type { PaymentMethod } from "@/lib/pricing/types";
import { CouponsSheet } from "./coupons-sheet";

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: { message?: string } };
    return data.error?.message ?? "Something went wrong";
  } catch {
    return "Something went wrong";
  }
}

export function CouponBox({
  cart,
  onCart,
  pincode,
  paymentMethod,
}: {
  cart: CartView;
  onCart: (cart: CartView) => void;
  pincode?: string | null;
  paymentMethod?: PaymentMethod | null;
}) {
  const { toast } = useToast();
  const badges = useBadges();
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [browse, setBrowse] = React.useState(0); // 0 = closed, otherwise the open-session number

  const apply = React.useCallback(
    async (raw: string): Promise<boolean> => {
      const value = raw.trim().toUpperCase();
      if (!value) {
        setError("Enter a coupon code");
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/cart/coupon", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: value }) });
        if (!res.ok) {
          setError(await readError(res));
          return false;
        }
        const next = (await res.json()) as CartView;
        badges.setCartCount(next.itemCount);
        onCart(next);
        setCode("");
        track("coupon_applied", { code: value, discount: next.pricing.couponDiscount });
        toast({ title: `Coupon ${value} applied`, description: next.pricing.couponDiscount > 0 ? undefined : next.couponDescription ?? undefined, tone: "success" });
        return true;
      } catch {
        setError("Network error. Please try again.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [badges, onCart, toast],
  );

  const remove = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/cart/coupon", { method: "DELETE" });
      if (res.ok) onCart((await res.json()) as CartView);
      else toast({ title: await readError(res), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="coupon-heading" className="rounded-card border border-border bg-background p-4">
      <h2 id="coupon-heading" className="flex items-center gap-2 font-display text-base font-bold text-text">
        <TicketPercent className="h-5 w-5 text-primary" aria-hidden /> Coupons
      </h2>
      {cart.couponCode ? (
        <div className="mt-3 flex items-start justify-between gap-3 rounded-card bg-primary-soft p-3">
          <div className="min-w-0">
            <p className="font-mono text-sm font-bold text-primary">{cart.couponCode}</p>
            <p className="text-xs text-text-secondary">{cart.pricing.couponError ?? cart.couponDescription ?? "Applied"}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => void remove()} loading={busy}>
            Remove
          </Button>
        </div>
      ) : (
        <form
          className="mt-3 flex items-start gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void apply(code);
          }}
        >
          <Input
            label="Coupon code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (error) setError(null);
            }}
            placeholder="e.g. WELCOME10"
            autoCapitalize="characters"
            autoComplete="off"
            error={error ?? undefined}
            className="flex-1"
          />
          <Button type="submit" variant="outline" loading={busy} className="mt-[26px]">
            Apply
          </Button>
        </form>
      )}
      <button type="button" onClick={() => setBrowse((n) => n + 1)} className="mt-2 min-h-[44px] text-sm font-semibold text-primary">
        Browse coupons
      </button>
      <CouponsSheet open={browse > 0} session={browse} onClose={() => setBrowse(0)} onApply={apply} pincode={pincode} paymentMethod={paymentMethod} />
    </section>
  );
}
