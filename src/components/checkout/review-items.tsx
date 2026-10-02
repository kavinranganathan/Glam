import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { CartItemView } from "@/lib/cart/types";
import { formatINR } from "@/lib/utils/money";

export function ReviewItems({ items, buyNow }: { items: CartItemView[]; buyNow: boolean }) {
  return (
    <div>
      <ul className="divide-y divide-border">
        {items.map((it) => {
          const oos = it.maxQty === 0 || it.stock <= 0;
          return (
            <li key={it.id} className="flex items-center gap-3 py-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-card bg-surface">
                {it.image && <Image src={it.image} alt={`${it.brandName} ${it.name}`} fill sizes="64px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-text-tertiary">{it.brandName}</p>
                <Link href={`/p/${it.slug}`} className="line-clamp-2 text-sm font-semibold leading-snug text-text">
                  {it.name}
                </Link>
                <p className="text-xs text-text-secondary">
                  {it.variantKind !== "default" ? `${it.variantName} · ` : ""}Qty {it.qty}
                  {it.offerLabel ? ` · ${it.offerLabel}` : ""}
                </p>
                {oos && (
                  <Badge tone="error" className="mt-1">
                    Out of stock
                  </Badge>
                )}
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">{formatINR(it.lineTotal || it.unitPrice * it.qty)}</p>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between pt-2 text-sm">
        {buyNow ? <span className="text-text-tertiary">Buying this item only; the rest of your bag is untouched.</span> : <span />}
        <Link href="/bag" className="inline-flex min-h-[44px] items-center font-semibold text-primary">
          Edit bag
        </Link>
      </div>
    </div>
  );
}
