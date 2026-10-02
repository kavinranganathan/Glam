"use client";

import Image from "next/image";
import Link from "next/link";
import { Bookmark, Heart, Minus, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { useToast } from "@/components/ui/toast";
import type { CartItemView } from "@/lib/cart/types";
import { cn } from "@/lib/utils/cn";
import { formatINR } from "@/lib/utils/money";

export interface CartItemProps {
  item: CartItemView;
  pending?: boolean;
  onQty: (item: CartItemView, qty: number) => void;
  onRemove: (item: CartItemView) => void;
  onSaveForLater: (item: CartItemView) => void;
  onMoveToWishlist: (item: CartItemView) => void;
}

export function CartItem({ item, pending, onQty, onRemove, onSaveForLater, onMoveToWishlist }: CartItemProps) {
  const { toast } = useToast();
  const outOfStock = item.maxQty === 0 || item.stock <= 0;
  const href = `/p/${item.slug}`;

  const step = (delta: number) => {
    const next = item.qty + delta;
    if (next < 1) return;
    if (next > item.maxQty) {
      toast({ title: item.maxQty >= 10 ? "Maximum 10 per order" : `Only ${item.maxQty} left in stock`, tone: "warning" });
      return;
    }
    onQty(item, next);
  };

  return (
    <li className={cn("flex gap-3 py-4", outOfStock && "opacity-90")} data-item-id={item.id}>
      <Link href={href} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-card bg-surface sm:h-28 sm:w-28">
        {item.image ? <Image src={item.image} alt={`${item.brandName} ${item.name}`} fill sizes="112px" className={cn("object-cover", outOfStock && "grayscale")} /> : null}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-xs font-medium text-text-tertiary">{item.brandName}</p>
        <Link href={href} className="line-clamp-2 text-sm font-semibold leading-snug text-text">
          {item.name}
        </Link>
        <VariantLine item={item} />
        {item.offerLabel && <p className="text-xs font-semibold text-secondary">{item.offerLabel}</p>}
        {outOfStock ? (
          <Badge tone="error" className="w-fit">Out of stock</Badge>
        ) : (
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center rounded-pill border border-border" role="group" aria-label={`Quantity for ${item.name}`}>
              <button type="button" onClick={() => step(-1)} disabled={pending || item.qty <= 1} aria-label="Decrease quantity" className="flex h-10 w-10 items-center justify-center rounded-l-pill text-text disabled:opacity-40">
                <Minus className="h-4 w-4" aria-hidden />
              </button>
              <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">{item.qty}</span>
              <button type="button" onClick={() => step(1)} disabled={pending} aria-label="Increase quantity" className={cn("flex h-10 w-10 items-center justify-center rounded-r-pill text-text", item.qty >= item.maxQty && "text-text-tertiary")}>
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="text-right">
              <Price price={item.unitPrice} mrp={item.mrp} size="sm" showDiscount={false} />
              {item.qty > 1 && <p className="text-xs text-text-tertiary">{formatINR(item.lineTotal)} total</p>}
              {item.priceSource === "pro" && <p className="text-xs font-semibold text-secondary">Pro price</p>}
              {item.priceSource === "flash" && <p className="text-xs font-semibold text-error">Flash sale</p>}
            </div>
          </div>
        )}
        {item.stock > 0 && item.stock <= 3 && !outOfStock && <p className="text-xs font-semibold text-warning">Only {item.stock} left</p>}
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {outOfStock ? (
            <button type="button" onClick={() => onMoveToWishlist(item)} disabled={pending} className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-primary">
              <Heart className="h-4 w-4" aria-hidden /> Move to wishlist
            </button>
          ) : (
            <button type="button" onClick={() => onSaveForLater(item)} disabled={pending} className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-text-secondary">
              <Bookmark className="h-4 w-4" aria-hidden /> Save for later
            </button>
          )}
          <button type="button" onClick={() => onRemove(item)} disabled={pending} className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-text-secondary">
            <Trash2 className="h-4 w-4" aria-hidden /> Remove
          </button>
        </div>
      </div>
    </li>
  );
}

export function VariantLine({ item }: { item: CartItemView }) {
  if (item.variantKind === "default") return null;
  return (
    <p className="flex items-center gap-1.5 text-xs text-text-secondary">
      {item.variantKind === "shade" && <span className="inline-block h-3 w-3 rounded-full border border-border" style={{ background: item.shadeHex ?? "#ddd" }} aria-hidden />}
      {item.variantKind === "shade" ? "Shade" : "Size"}: {item.variantName}
    </p>
  );
}
