import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";

/** Sticky "Proceed to Checkout · ₹total" bar; sits above the mobile bottom nav. */
export function CheckoutBar({
  total,
  count,
  disabled,
  loading,
  onCheckout,
  className,
  inline,
}: {
  total: number;
  count: number;
  disabled?: boolean;
  loading?: boolean;
  onCheckout: () => void;
  className?: string;
  /** Render in flow (desktop summary) instead of fixed to the viewport. */
  inline?: boolean;
}) {
  return (
    <div className={cn(inline ? "" : "fixed inset-x-0 bottom-16 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden", className)}>
      <div className={cn("flex items-center gap-3", inline && "flex-col items-stretch")}>
        {!inline && (
          <div className="min-w-0">
            <p className="text-xs text-text-tertiary">
              {count} {count === 1 ? "item" : "items"}
            </p>
            <p className="font-display text-lg font-bold tabular-nums">{formatINR(total)}</p>
          </div>
        )}
        <Button size="lg" fullWidth={inline} className={cn(!inline && "ml-auto flex-1")} disabled={disabled} loading={loading} onClick={onCheckout}>
          Proceed to Checkout{inline ? ` · ${formatINR(total)}` : ""}
        </Button>
      </div>
    </div>
  );
}
