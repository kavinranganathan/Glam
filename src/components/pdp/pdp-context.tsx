"use client";

import * as React from "react";
import type { ProductDetail, VariantView } from "@/lib/catalogue/types";
import { pickInitialVariant, pricingFor, type SelectedPricing } from "./variant-logic";

export type { SelectedPricing } from "./variant-logic";

interface PdpContextValue {
  product: ProductDetail;
  variant: VariantView;
  variants: VariantView[];
  select: (variantId: string) => void;
  isPro: boolean;
  isLoggedIn: boolean;
  pricing: SelectedPricing;
}

const PdpContext = React.createContext<PdpContextValue | null>(null);

/** Holds the selected variant for the PDP and mirrors it into `?v=` without a server round-trip. */
export function PdpProvider({
  product,
  initialVariantId,
  isPro,
  isLoggedIn,
  children,
}: {
  product: ProductDetail;
  initialVariantId: string | null;
  isPro: boolean;
  isLoggedIn: boolean;
  children: React.ReactNode;
}) {
  const [selectedId, setSelectedId] = React.useState(() => pickInitialVariant(product.variants, initialVariantId).id);
  const variant = product.variants.find((v) => v.id === selectedId) ?? product.variants[0];

  const select = React.useCallback(
    (variantId: string) => {
      setSelectedId(variantId);
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("v", variantId);
        // Next.js keeps useSearchParams in sync with the native History API (no RSC refetch).
        window.history.replaceState(window.history.state, "", url);
      } catch {
        // URL sync is a nicety; selection still works.
      }
    },
    [],
  );

  const value = React.useMemo<PdpContextValue>(
    () => ({ product, variant, variants: product.variants, select, isPro, isLoggedIn, pricing: pricingFor(product, variant, isPro) }),
    [product, variant, select, isPro, isLoggedIn],
  );
  return <PdpContext.Provider value={value}>{children}</PdpContext.Provider>;
}

export function usePdp(): PdpContextValue {
  const ctx = React.useContext(PdpContext);
  if (!ctx) throw new Error("usePdp must be used inside <PdpProvider>");
  return ctx;
}
