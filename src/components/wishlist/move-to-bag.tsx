"use client";

import * as React from "react";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { Sheet } from "@/components/ui/sheet";
import { VariantChips } from "@/components/product/quick-add";
import { useCartActions } from "@/components/product/use-cart-actions";
import type { VariantView } from "@/lib/catalogue/types";
import type { WishlistItemView } from "@/lib/wishlist/types";
import { formatINR } from "@/lib/utils/money";

/** "Move to Bag": single-variant products add directly; multi-variant products open a picker. */
export function MoveToBag({ item, onMoved }: { item: WishlistItemView; onMoved: (item: WishlistItemView) => void }) {
  const { addToBag, pending } = useCartActions();
  const [open, setOpen] = React.useState(false);
  const [variants, setVariants] = React.useState<VariantView[] | null>(null);
  const [selected, setSelected] = React.useState<string | null>(item.variantId);

  const add = async (variantId: string) => {
    const cart = await addToBag(variantId);
    if (cart) {
      setOpen(false);
      onMoved(item);
    }
  };

  const onClick = async () => {
    if (!item.inStock) return;
    if (!item.hasVariants) {
      await add(item.defaultVariantId);
      return;
    }
    setOpen(true);
    if (!variants) {
      const res = await fetch(`/api/products/${item.slug}/variants`).catch(() => null);
      if (res?.ok) {
        const data = (await res.json()) as { variants: VariantView[] };
        setVariants(data.variants);
        const preferred = data.variants.find((v) => v.id === item.variantId && v.stock > 0) ?? data.variants.find((v) => v.isDefault && v.stock > 0) ?? data.variants.find((v) => v.stock > 0);
        setSelected(preferred?.id ?? null);
      }
    }
  };

  const current = variants?.find((v) => v.id === selected) ?? null;

  return (
    <>
      <Button size="sm" fullWidth variant={item.inStock ? "primary" : "outline"} disabled={!item.inStock || pending} onClick={() => void onClick()}>
        <ShoppingBag className="h-4 w-4" aria-hidden />
        {item.inStock ? "Move to Bag" : "Out of stock"}
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Choose an option"
        desktop="modal"
        footer={
          <Button fullWidth disabled={!current || current.stock === 0} loading={pending} onClick={() => current && void add(current.id)}>
            {current ? `Move to Bag · ${formatINR(current.price)}` : "Move to Bag"}
          </Button>
        }
      >
        <div className="flex gap-3">
          {item.image && <Image src={item.image} alt="" width={72} height={72} className="h-18 w-18 rounded-card bg-surface object-cover" />}
          <div className="min-w-0">
            <p className="text-xs text-text-tertiary">{item.brandName}</p>
            <p className="line-clamp-2 text-sm font-semibold">{item.name}</p>
            {current && <Price price={current.price} mrp={current.mrp} size="sm" className="mt-1" />}
          </div>
        </div>
        <div className="mt-4">
          {!variants ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-10 w-20 rounded-pill" />
              ))}
            </div>
          ) : (
            <VariantChips variants={variants} selected={selected} onSelect={setSelected} />
          )}
        </div>
      </Sheet>
    </>
  );
}
