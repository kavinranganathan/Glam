import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { OrderItemView } from "@/lib/orders/views";
import type { OrderStatus } from "@/lib/orders/state-machine";
import { formatINR } from "@/lib/utils/money";

const REVIEWABLE: OrderStatus[] = ["delivered", "return_initiated", "returned", "refunded"];

/** Line items with price, quantity, return state and the Rate & Review link for delivered items. */
export function OrderItems({ items, status, compact = false }: { items: OrderItemView[]; status: OrderStatus; compact?: boolean }) {
  const canReview = REVIEWABLE.includes(status);
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className="flex gap-3 py-3">
          <Link href={`/p/${item.slug}`} className="relative h-20 w-16 shrink-0 overflow-hidden rounded-card bg-surface">
            {item.image ? <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" /> : null}
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">{item.brandName}</p>
            <Link href={`/p/${item.slug}`} className="line-clamp-2 text-sm font-medium text-text">
              {item.name}
            </Link>
            <p className="text-xs text-text-tertiary">
              {item.variantName !== "Default" && item.variantName ? `${item.variantName} · ` : ""}Qty {item.qty}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-text">{formatINR(item.lineTotal)}</span>
              {item.mrp > item.unitPrice && <span className="text-xs text-text-tertiary line-through">{formatINR(item.mrp * item.qty)}</span>}
              {item.returnedQty > 0 && <Badge tone="warning">{item.returnedQty === item.qty ? "Returned" : `${item.returnedQty} returned`}</Badge>}
              {item.nonReturnable && <Badge tone="neutral">Non-returnable</Badge>}
            </div>
            {!compact && canReview && (
              <div className="mt-2">
                {item.reviewed ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                    <Star className="h-3.5 w-3.5 fill-current" aria-hidden /> Reviewed
                  </span>
                ) : (
                  <Link
                    href={`/p/${item.slug}?review=${item.id}#reviews`}
                    className="btn inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary"
                  >
                    <Star className="h-4 w-4" aria-hidden /> Rate &amp; Review
                  </Link>
                )}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
