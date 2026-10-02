import type { ProductDetail, VariantView } from "@/lib/catalogue/types";

export interface SelectedPricing {
  /** Price the shopper pays right now (flash > Pro > variant). */
  price: number;
  mrp: number;
  source: "base" | "pro" | "flash";
  /** Pro price shown as an upsell to non-Pro members when it beats the current price. */
  proTeaser: number | null;
}

/** Mirrors the pricing engine's unit-price precedence for a single variant. */
export function pricingFor(product: ProductDetail, variant: VariantView, isPro: boolean): SelectedPricing {
  const base = variant.price;
  const flash = product.flashPrice !== null && product.flashPrice < base ? product.flashPrice : null;
  const pro = product.proPrice !== null && product.proPrice < base ? product.proPrice : null;
  if (flash !== null) return { price: flash, mrp: variant.mrp, source: "flash", proTeaser: null };
  if (pro !== null && isPro) return { price: pro, mrp: variant.mrp, source: "pro", proTeaser: null };
  return { price: base, mrp: variant.mrp, source: "base", proTeaser: pro !== null && !isPro ? pro : null };
}

/** `?v=` wins when valid; otherwise the default in-stock variant, any in-stock, the default, then the first. */
export function pickInitialVariant(variants: VariantView[], requested: string | null | undefined): VariantView {
  return (
    variants.find((v) => v.id === requested) ??
    variants.find((v) => v.isDefault && v.stock > 0) ??
    variants.find((v) => v.stock > 0) ??
    variants.find((v) => v.isDefault) ??
    variants[0]
  );
}
