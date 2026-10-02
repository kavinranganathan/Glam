"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics/track";
import { formatINR } from "@/lib/utils/money";
import { usePdp } from "@/components/pdp/pdp-context";
import { useCartActions } from "./use-cart-actions";
import { NotifyMeButton } from "./notify-me";

/** Sticky bottom CTA bar (PRD §8.5.6): Add to Bag with tick confirmation, Buy Now → checkout. */
export function AddToBagBar() {
  const { product, variant, pricing } = usePdp();
  const { addToBag, pending } = useCartActions();
  const router = useRouter();
  const [added, setAdded] = React.useState(false);
  const [buying, setBuying] = React.useState(false);
  const oos = variant.stock <= 0;

  const trackAdd = (source: string) =>
    track("add_to_cart", {
      product_id: product.id,
      variant_id: variant.id,
      sku: variant.sku,
      price: pricing.price,
      qty: 1,
      source,
    });

  const onAdd = async () => {
    const cart = await addToBag(variant.id, 1);
    if (!cart) return;
    trackAdd("pdp");
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  const onBuyNow = async () => {
    setBuying(true);
    try {
      const cart = await addToBag(variant.id, 1, { silent: true });
      if (!cart) return;
      trackAdd("buy_now");
      const item = cart.items.find((i) => i.variantId === variant.id);
      router.push(item ? `/checkout?buyNow=${encodeURIComponent(item.id)}` : "/checkout");
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 border-t border-border bg-background/95 backdrop-blur pb-safe md:bottom-0">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
        <div className="hidden min-w-0 flex-col sm:flex">
          <span className="truncate text-xs text-text-tertiary">{variant.name !== "Default" ? variant.name : product.brand.name}</span>
          <span className="text-base font-bold text-text">{formatINR(pricing.price)}</span>
        </div>
        <div className="ml-auto flex w-full gap-2 sm:w-auto">
          {oos ? (
            <div className="flex-1 sm:w-72">
              <NotifyMeButton variantId={variant.id} fullWidth />
            </div>
          ) : (
            <>
              <Button
                variant="outline"
                size="lg"
                className="flex-1 sm:w-44"
                onClick={onAdd}
                loading={pending && !buying}
                aria-live="polite"
                data-testid="add-to-bag"
              >
                {added ? <Check className="h-5 w-5 text-success" aria-hidden /> : <ShoppingBag className="h-5 w-5" aria-hidden />}
                {added ? "Added" : "Add to Bag"}
              </Button>
              <Button size="lg" className="flex-1 sm:w-44" onClick={onBuyNow} loading={buying}>
                Buy Now
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
