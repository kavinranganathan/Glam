"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { track } from "@/lib/analytics/track";
import { formatINR } from "@/lib/utils/money";
import type { ProductCard } from "@/lib/catalogue/types";
import { useCartActions } from "./use-cart-actions";
import { usePdp } from "@/components/pdp/pdp-context";

/** "Frequently Bought Together" bundle (PRD §8.5.11) with a combined-price add-all action. */
export function FrequentlyBoughtTogether({ items }: { items: ProductCard[] }) {
  const { product, variant, pricing } = usePdp();
  const { addToBag } = useCartActions();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const companions = items.filter((p) => p.id !== product.id && p.inStock).slice(0, 2);
  if (!companions.length) return null;

  const bundle: Array<{ id: string; name: string; brand: string; image: string; price: number; variantId: string; slug: string; mrp: number }> = [
    { id: product.id, name: product.name, brand: product.brand.name, image: product.images[0] ?? product.image, price: pricing.price, mrp: pricing.mrp, variantId: variant.id, slug: product.slug },
    ...companions.map((c) => ({ id: c.id, name: c.name, brand: c.brand.name, image: c.image, price: c.flashPrice ?? c.price, mrp: c.mrp, variantId: c.defaultVariantId, slug: c.slug })),
  ];
  const total = bundle.reduce((s, b) => s + b.price, 0);
  const totalMrp = bundle.reduce((s, b) => s + b.mrp, 0);

  const addAll = async () => {
    if (variant.stock <= 0) {
      toast({ title: "Pick an in-stock option first", tone: "warning" });
      return;
    }
    setBusy(true);
    let added = 0;
    for (const b of bundle) {
      const cart = await addToBag(b.variantId, 1, { silent: true });
      if (cart) {
        added += 1;
        track("add_to_cart", { product_id: b.id, variant_id: b.variantId, price: b.price, qty: 1, source: "fbt" });
      }
    }
    setBusy(false);
    if (added === bundle.length) toast({ title: `Added all ${bundle.length} to bag`, tone: "success", action: { label: "View bag", href: "/bag" } });
    else if (added > 0) toast({ title: `Added ${added} of ${bundle.length} items`, description: "Some items couldn't be added.", tone: "warning" });
  };

  return (
    <section className="px-4 py-4" aria-labelledby="fbt-heading">
      <h2 id="fbt-heading" className="mb-3 font-display text-lg font-bold text-text md:text-xl">
        Frequently Bought Together
      </h2>
      <div className="rounded-card border border-border p-4">
        <ul className="flex flex-wrap items-center gap-3">
          {bundle.map((b, i) => (
            <React.Fragment key={b.id}>
              {i > 0 && <Plus className="h-5 w-5 text-text-tertiary" aria-hidden />}
              <li className="flex w-[calc(50%-1.5rem)] flex-col gap-1 sm:w-40">
                <Link href={`/p/${b.slug}`} className="relative block aspect-square overflow-hidden rounded-card bg-surface">
                  <Image src={b.image} alt={`${b.brand} ${b.name}`} fill sizes="160px" className="object-cover" />
                </Link>
                <p className="truncate text-xs text-text-tertiary">{b.brand}</p>
                <p className="line-clamp-2 text-sm font-medium text-text">{b.name}</p>
                <p className="text-sm font-bold text-text">{formatINR(b.price)}</p>
              </li>
            </React.Fragment>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-sm text-text-secondary">
            Bundle price <span className="text-lg font-bold text-text">{formatINR(total)}</span>
            {totalMrp > total && <s className="ml-2 text-text-tertiary">{formatINR(totalMrp)}</s>}
          </p>
          <Button onClick={addAll} loading={busy} size="lg">
            Add all {bundle.length} to bag
          </Button>
        </div>
      </div>
    </section>
  );
}
