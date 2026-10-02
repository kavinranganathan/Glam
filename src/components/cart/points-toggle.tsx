"use client";

import * as React from "react";
import Link from "next/link";
import { Coins } from "lucide-react";
import { Toggle } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { CartView } from "@/lib/cart/types";
import { pointsValue } from "@/lib/loyalty/points";
import { formatINR } from "@/lib/utils/money";

export function PointsToggle({
  cart,
  isLoggedIn,
  onCart,
  next = "/bag",
}: {
  cart: CartView;
  isLoggedIn: boolean;
  onCart: (cart: CartView) => void;
  /** Where to return after signing in. */
  next?: string;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const balance = cart.pointsBalance;

  const change = async (use: boolean) => {
    setBusy(true);
    try {
      const res = await fetch("/api/cart/points", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usePoints: use }) });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        toast({ title: data?.error?.message ?? "Couldn't update points", tone: "error" });
        return;
      }
      onCart((await res.json()) as CartView);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="points-heading" className="rounded-card border border-border bg-background px-4 py-2">
      <h2 id="points-heading" className="sr-only">
        GLAM points
      </h2>
      {!isLoggedIn ? (
        <div className="flex items-center justify-between gap-3 py-2">
          <span className="flex items-center gap-2 text-sm text-text-secondary">
            <Coins className="h-5 w-5 text-warning" aria-hidden /> Have GLAM points?
          </span>
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-primary">
            Sign in to redeem
          </Link>
        </div>
      ) : (
        <Toggle
          checked={cart.usePoints}
          onChange={(v) => void change(v)}
          disabled={busy || balance <= 0}
          label={balance > 0 ? `Use ${balance.toLocaleString("en-IN")} points (worth ${formatINR(pointsValue(balance))})` : "No GLAM points yet"}
          description={balance > 0 ? (cart.usePoints && cart.pricing.pointsRedeemed > 0 ? `${cart.pricing.pointsRedeemed.toLocaleString("en-IN")} points applied · 1 point = ₹0.25` : "1 point = ₹0.25 · applied after coupons") : "Earn 1 point for every ₹10 you spend"}
        />
      )}
    </section>
  );
}
