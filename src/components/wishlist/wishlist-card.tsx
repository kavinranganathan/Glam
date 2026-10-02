"use client";

import Image from "next/image";
import Link from "next/link";
import { FolderInput, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import type { WishlistItemView } from "@/lib/wishlist/types";

export function WishlistCard({
  item,
  onRemove,
  onMove,
  onMovedToBag,
  canMove,
  moveToBag,
}: {
  item: WishlistItemView;
  onRemove: (item: WishlistItemView) => void;
  onMove: (item: WishlistItemView) => void;
  onMovedToBag: (item: WishlistItemView) => void;
  canMove: boolean;
  moveToBag: (item: WishlistItemView, onMoved: (i: WishlistItemView) => void) => React.ReactNode;
}) {
  const href = `/p/${item.slug}`;
  return (
    <article className="group relative flex flex-col rounded-card border border-border bg-background shadow-card">
      <Link href={href} className="relative block aspect-square overflow-hidden rounded-t-card bg-surface">
        {item.image && <Image src={item.image} alt={`${item.brandName} ${item.name}`} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none" />}
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {item.priceDropped && <Badge tone="success">Price dropped</Badge>}
          {item.backInStock && <Badge tone="info">Back in stock</Badge>}
        </div>
        {!item.inStock && (
          <div className="absolute inset-0 flex items-end justify-center bg-white/60 p-2">
            <span className="rounded-pill bg-text px-3 py-1 text-xs font-semibold text-white">Out of Stock</span>
          </div>
        )}
      </Link>
      <button type="button" onClick={() => onRemove(item)} aria-label={`Remove ${item.name} from wishlist`} className="absolute right-2 top-2 inline-flex h-9 w-9 min-h-0 items-center justify-center rounded-full bg-white/90 text-text-secondary shadow-sm hover:text-error">
        <X className="h-4 w-4" aria-hidden />
      </button>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="truncate text-xs font-medium text-text-tertiary">{item.brandName}</p>
        <Link href={href} className="line-clamp-2 text-sm font-semibold leading-snug text-text">
          {item.name}
        </Link>
        <Price price={item.price} mrp={item.mrp} size="sm" />
        {item.priceDropped && <p className="text-xs text-success">Was {`₹${item.priceAtAdd / 100}`} when you saved it</p>}
        <div className="mt-auto flex items-center gap-2 pt-2">
          <div className="flex-1">{moveToBag(item, onMovedToBag)}</div>
          {canMove && (
            <button type="button" onClick={() => onMove(item)} aria-label="Move to another collection" title="Move to collection" className="inline-flex h-9 w-9 min-h-0 shrink-0 items-center justify-center rounded-full border border-border text-text-secondary hover:bg-surface">
              <FolderInput className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
