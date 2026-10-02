"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import type { CartItemView } from "@/lib/cart/types";
import { VariantLine } from "./cart-item";

export function SavedForLater({
  items,
  pending,
  onMoveToBag,
  onRemove,
}: {
  items: CartItemView[];
  pending?: boolean;
  onMoveToBag: (item: CartItemView) => void;
  onRemove: (item: CartItemView) => void;
}) {
  if (!items.length) return null;
  return (
    <section aria-labelledby="saved-heading" className="mt-6">
      <h2 id="saved-heading" className="font-display text-lg font-bold text-text">
        Saved for later <span className="text-sm font-medium text-text-tertiary">({items.length})</span>
      </h2>
      <ul className="mt-2 divide-y divide-border">
        {items.map((item) => {
          const outOfStock = item.stock <= 0;
          return (
            <li key={item.id} className="flex gap-3 py-3">
              <Link href={`/p/${item.slug}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-card bg-surface">
                {item.image ? <Image src={item.image} alt={`${item.brandName} ${item.name}`} fill sizes="80px" className="object-cover" /> : null}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="truncate text-xs text-text-tertiary">{item.brandName}</p>
                <Link href={`/p/${item.slug}`} className="line-clamp-2 text-sm font-semibold leading-snug">
                  {item.name}
                </Link>
                <VariantLine item={item} />
                <Price price={item.unitPrice} mrp={item.mrp} size="sm" />
                <div className="mt-1 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={pending || outOfStock} onClick={() => onMoveToBag(item)}>
                    {outOfStock ? "Out of stock" : "Move to Bag"}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => onRemove(item)}>
                    Remove
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
