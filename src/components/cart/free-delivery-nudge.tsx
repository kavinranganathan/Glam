import { Truck } from "lucide-react";
import { Shelf } from "@/components/product/shelf";
import type { ProductCard } from "@/lib/catalogue/types";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/pricing/delivery";
import { formatINR } from "@/lib/utils/money";

/** "Add ₹x more for free delivery" progress plus a shelf of popular picks that close the gap. */
export function FreeDeliveryNudge({ gap, items }: { gap: number; items: ProductCard[] }) {
  if (gap <= 0) return null;
  const pct = Math.min(100, Math.max(4, Math.round(((FREE_DELIVERY_THRESHOLD - gap) / FREE_DELIVERY_THRESHOLD) * 100)));
  const underGap = items.filter((p) => (p.flashPrice ?? p.price) <= gap && p.inStock);
  const picks = (underGap.length >= 2 ? underGap : [...items].sort((a, b) => (a.flashPrice ?? a.price) - (b.flashPrice ?? b.price))).slice(0, 8);
  return (
    <section aria-label="Free delivery progress" className="mt-4 rounded-card border border-border bg-background">
      <div className="px-4 pt-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-text">
          <Truck className="h-4 w-4 text-primary" aria-hidden />
          Add {formatINR(gap)} more for free delivery
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progress to free delivery">
          <div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-xs text-text-tertiary">Free delivery on orders of {formatINR(FREE_DELIVERY_THRESHOLD)} or more</p>
      </div>
      <Shelf title="Add a little something" subtitle="Popular picks that get you there" items={picks} shelfKey="free_delivery_nudge" className="pb-2" />
    </section>
  );
}
