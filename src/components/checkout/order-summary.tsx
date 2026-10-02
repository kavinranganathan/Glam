import { Truck, TriangleAlert } from "lucide-react";
import { PriceSummary } from "@/components/cart/price-summary";
import type { CheckoutQuote } from "@/lib/orders/types";
import { cn } from "@/lib/utils/cn";
import { formatShortDate } from "@/lib/utils/dates";

/** Sticky summary column: counts, ETA, warnings, price breakdown and (desktop) place-order slot. */
export function OrderSummary({
  quote,
  isLoggedIn,
  onRemoveCoupon,
  quoting,
  children,
  className,
}: {
  quote: CheckoutQuote;
  isLoggedIn: boolean;
  onRemoveCoupon?: () => void;
  quoting?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  const { cart, pricing } = quote;
  return (
    <div className={cn("flex flex-col gap-3", quoting && "opacity-70 transition-opacity", className)} aria-busy={quoting}>
      <div className="rounded-card border border-border bg-surface px-4 py-3 text-sm">
        <p className="font-semibold text-text">
          {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}
        </p>
        <p className="flex items-center gap-1.5 text-text-secondary">
          <Truck className="h-4 w-4" aria-hidden />
          {quote.pincode?.serviceable ? `Arriving by ${formatShortDate(quote.estimatedDelivery)}` : "Add a delivery address to see arrival date"}
        </p>
      </div>
      {quote.warnings.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-card border border-warning/40 bg-warning-soft p-3 text-sm text-warning" role="alert">
          {quote.warnings.map((w) => (
            <li key={w} className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {w}
            </li>
          ))}
        </ul>
      )}
      <PriceSummary pricing={pricing} couponCode={cart.couponCode} couponDescription={cart.couponDescription} isPro={cart.isPro} isLoggedIn={isLoggedIn} paymentMethod={quote.paymentMethod} onRemoveCoupon={onRemoveCoupon} />
      {children}
    </div>
  );
}
