"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Clock, Copy, Crown, ShoppingBag, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { track } from "@/lib/analytics/track";
import { formatShortDate } from "@/lib/utils/dates";
import { formatINR } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";

export interface CouponView {
  code: string;
  description: string;
  minOrder: number;
  endsAt: string | null;
  proOnly: boolean;
  personal: boolean;
  expiringSoon: boolean;
  redeemedAt?: string | null;
}

/** S38 coupon card: code, description, min order, expiry, Copy and Apply-in-bag. */
export function CouponCard({ coupon, canApply = true }: { coupon: CouponView; canApply?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [applying, setApplying] = React.useState(false);
  const redeemed = Boolean(coupon.redeemedAt);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      toast({ title: `${coupon.code} copied`, tone: "success" });
    } catch {
      toast({ title: `Code: ${coupon.code}`, tone: "info" });
    }
  };

  const apply = async () => {
    setApplying(true);
    try {
      const res = await fetch("/api/cart/coupon", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: coupon.code }) });
      const json = (await res.json()) as { error?: { message: string } };
      if (!res.ok) throw new Error(json.error?.message ?? "Could not apply coupon");
      track("coupon_applied", { code: coupon.code, source: "offers" });
      toast({ title: `${coupon.code} applied to your bag`, tone: "success" });
      router.push("/bag");
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Could not apply coupon", tone: "error", action: { label: "Open bag", href: "/bag" } });
    } finally {
      setApplying(false);
    }
  };

  return (
    <article
      className={cn("relative flex flex-col gap-3 rounded-card border bg-background p-4", coupon.expiringSoon && !redeemed ? "border-warning" : "border-border", redeemed && "opacity-70")}
      aria-label={`Coupon ${coupon.code}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded-input border border-dashed border-primary bg-primary-soft px-2.5 py-1 font-mono text-sm font-bold tracking-wider text-primary">{coupon.code}</code>
        {coupon.proOnly && (
          <Badge tone="secondary">
            <Crown className="h-3 w-3" aria-hidden /> Pro exclusive
          </Badge>
        )}
        {coupon.personal && (
          <Badge tone="info">
            <UserRound className="h-3 w-3" aria-hidden /> Just for you
          </Badge>
        )}
        {coupon.expiringSoon && !redeemed && (
          <Badge tone="warning">
            <Clock className="h-3 w-3" aria-hidden /> Expiring soon
          </Badge>
        )}
        {redeemed && <Badge tone="neutral">Redeemed</Badge>}
      </div>
      <p className="font-display text-base font-semibold text-text">{coupon.description}</p>
      <p className="text-sm text-text-secondary">
        {coupon.minOrder > 0 ? `On orders above ${formatINR(coupon.minOrder)}` : "No minimum order"}
        {" · "}
        {redeemed && coupon.redeemedAt
          ? `Used on ${formatShortDate(coupon.redeemedAt)}`
          : coupon.endsAt
            ? `Valid till ${formatShortDate(coupon.endsAt)}`
            : "No expiry"}
      </p>
      {!redeemed && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copy}>
            <Copy className="h-4 w-4" aria-hidden /> Copy
          </Button>
          {canApply && (
            <Button size="sm" onClick={apply} loading={applying}>
              <ShoppingBag className="h-4 w-4" aria-hidden /> Apply in bag
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
