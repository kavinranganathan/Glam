import { Sparkles, X } from "lucide-react";
import type { PaymentMethod, PricingResult } from "@/lib/pricing/types";
import { cn } from "@/lib/utils/cn";
import { formatINR } from "@/lib/utils/money";

export interface PriceSummaryProps {
  pricing: PricingResult;
  couponCode: string | null;
  couponDescription?: string | null;
  isPro: boolean;
  isLoggedIn: boolean;
  paymentMethod?: PaymentMethod | null;
  onRemoveCoupon?: () => void;
  className?: string;
}

/** Price breakdown (PRD §8.6.1). Money arrives as paise; GST is shown as inclusive. */
export function PriceSummary({ pricing: p, couponCode, couponDescription, isPro, isLoggedIn, paymentMethod, onRemoveCoupon, className }: PriceSummaryProps) {
  const couponApplied = Boolean(p.couponCode) && p.couponDiscount >= 0 && !p.couponError;
  return (
    <section aria-labelledby="price-summary-heading" className={cn("rounded-card border border-border bg-background p-4", className)}>
      <h2 id="price-summary-heading" className="font-display text-base font-bold text-text">
        Price details
      </h2>
      <dl className="mt-3 flex flex-col gap-2 text-sm">
        <Row label="Subtotal" value={formatINR(p.subtotal)} />
        {p.itemDiscount > 0 && <Row label="Item offers" value={`−${formatINR(p.itemDiscount)}`} tone="success" />}
        {couponCode && (
          <div className="flex items-start justify-between gap-3">
            <dt className="flex min-w-0 flex-col gap-1 text-text-secondary">
              <span className="flex items-center gap-2">
                Coupon
                <span className="inline-flex items-center gap-1 rounded-pill bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                  {couponCode}
                  {onRemoveCoupon && (
                    <button type="button" onClick={onRemoveCoupon} aria-label={`Remove coupon ${couponCode}`} className="rounded-full p-0.5 min-h-0 hover:bg-primary/10">
                      <X className="h-3 w-3" aria-hidden />
                    </button>
                  )}
                </span>
              </span>
              {p.couponError ? <span className="text-xs text-error">{p.couponError}</span> : couponDescription ? <span className="text-xs text-text-tertiary">{couponDescription}</span> : null}
            </dt>
            <dd className={cn("shrink-0 font-semibold tabular-nums", couponApplied ? "text-success" : "text-text-tertiary")}>{couponApplied ? `−${formatINR(p.couponDiscount)}` : "—"}</dd>
          </div>
        )}
        {p.pointsDiscount > 0 && <Row label={`GLAM points (${p.pointsRedeemed.toLocaleString("en-IN")} pts)`} value={`−${formatINR(p.pointsDiscount)}`} tone="success" />}
        <Row label="Delivery" value={p.deliveryLabel} tone={p.deliveryFee === 0 ? "success" : undefined} />
        {paymentMethod === "cod" && p.codFee > 0 && <Row label="Cash on Delivery fee" value={formatINR(p.codFee)} />}
        {isPro && p.proSavings > 0 && (
          <Row
            label={
              <span className="inline-flex items-center gap-1 text-secondary">
                <Sparkles className="h-3.5 w-3.5" aria-hidden /> GLAM Pro savings
              </span>
            }
            value={`−${formatINR(p.proSavings)}`}
            tone="secondary"
          />
        )}
        <Row label="Taxes" value="Inclusive" muted />
      </dl>
      <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
        <span className="font-display text-base font-bold text-text">Total</span>
        <span className="font-display text-xl font-bold text-text tabular-nums">{formatINR(p.total)}</span>
      </div>
      {p.totalSavings > 0 && (
        <p className="mt-2 rounded-card bg-success-soft px-3 py-2 text-sm font-semibold text-success" role="status">
          You&apos;re saving {formatINR(p.totalSavings)} on this order
        </p>
      )}
      {p.pointsToEarn > 0 && (
        <p className="mt-2 text-xs text-text-tertiary">
          {isLoggedIn ? `You'll earn ${p.pointsToEarn.toLocaleString("en-IN")} GLAM points once this order is delivered.` : `Sign in to earn ${p.pointsToEarn.toLocaleString("en-IN")} GLAM points on this order.`}
        </p>
      )}
    </section>
  );
}

function Row({ label, value, tone, muted }: { label: React.ReactNode; value: string; tone?: "success" | "secondary"; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-text-secondary">{label}</dt>
      <dd className={cn("font-semibold tabular-nums", tone === "success" && "text-success", tone === "secondary" && "text-secondary", muted && "font-medium text-text-tertiary")}>{value}</dd>
    </div>
  );
}
