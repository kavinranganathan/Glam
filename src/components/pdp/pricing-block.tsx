"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, Crown, Tag, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { formatINR } from "@/lib/utils/money";
import type { AvailableCouponView } from "@/lib/cart/types";
import { cn } from "@/lib/utils/cn";
import { usePdp } from "./pdp-context";

/** Price for the selected variant plus Pro / flash badges and an expandable offers list (PRD §8.5.3). */
export function PricingBlock({ className }: { className?: string }) {
  const { product, pricing } = usePdp();
  const [open, setOpen] = React.useState(false);
  const [coupons, setCoupons] = React.useState<AvailableCouponView[] | null>(null);
  const [loading, setLoading] = React.useState(false);

  const loadCoupons = React.useCallback(async () => {
    if (coupons || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/coupons/available");
      if (res.ok) {
        const data = (await res.json()) as { coupons: AvailableCouponView[] };
        setCoupons(data.coupons.filter((c) => c.eligible || c.reason === null || c.reason === "min_order"));
      } else setCoupons([]);
    } catch {
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, [coupons, loading]);

  const toggle = () => {
    setOpen((o) => !o);
    void loadCoupons();
  };

  return (
    <section className={cn("flex flex-col gap-2", className)} aria-label="Price">
      <div className="flex flex-wrap items-center gap-2">
        <Price price={pricing.price} mrp={pricing.mrp} size="lg" />
        {pricing.source === "flash" && (
          <Badge tone="error">
            <Zap className="h-3 w-3" aria-hidden /> Flash sale
          </Badge>
        )}
        {pricing.source === "pro" && (
          <Badge tone="secondary">
            <Crown className="h-3 w-3" aria-hidden /> Pro price
          </Badge>
        )}
      </div>
      <p className="text-xs text-text-tertiary">Inclusive of all taxes</p>
      {pricing.proTeaser !== null && (
        <Link href="/pro" className="inline-flex w-fit items-center gap-1.5 rounded-pill bg-secondary-soft px-3 py-1.5 text-xs font-semibold text-secondary">
          <Crown className="h-3.5 w-3.5" aria-hidden /> Pro {formatINR(pricing.proTeaser)} · Join GLAM Pro
        </Link>
      )}
      <div className="mt-1 rounded-card border border-border">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-controls="pdp-offers"
            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-semibold text-text"
          >
            <span className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-secondary" aria-hidden />
              {product.offerLabel ? `Offer: ${product.offerLabel}` : "Offers & coupons"}
            </span>
            <ChevronDown className={cn("h-4 w-4 text-text-tertiary transition-transform", open && "rotate-180")} aria-hidden />
          </button>
          {open && (
            <div id="pdp-offers" className="border-t border-border px-3 py-3 text-sm text-text-secondary">
              {product.offerType === "bxgy" && (
                <p className="mb-2">
                  <span className="font-semibold text-secondary">{product.offerLabel}</span> — add {product.offerBuy + product.offerGet} to your bag and the
                  cheapest {product.offerGet} {product.offerGet === 1 ? "is" : "are"} free.
                </p>
              )}
              {loading && <p className="text-text-tertiary">Loading coupons…</p>}
              {coupons && coupons.length === 0 && !loading && <p className="text-text-tertiary">No coupons right now. Check back soon!</p>}
              {coupons && coupons.length > 0 && (
                <ul className="space-y-2">
                  {coupons.slice(0, 5).map((c) => (
                    <li key={c.code} className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-text">{c.description}</p>
                        <p className="text-xs text-text-tertiary">
                          {c.minOrder > 0 ? `On orders above ${formatINR(c.minOrder)}` : "No minimum order"}
                          {c.proOnly ? " · Pro only" : ""}
                        </p>
                      </div>
                      <code className="shrink-0 rounded border border-dashed border-secondary px-2 py-0.5 text-xs font-bold text-secondary">{c.code}</code>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
    </section>
  );
}
