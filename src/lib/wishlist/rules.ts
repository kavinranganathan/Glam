/** Pure wishlist rules. No I/O. */

/** A "price drop" badge needs the current price to be at least 10% under the price at add (PRD §8.6.2). */
export const PRICE_DROP_RATIO = 0.9;

export function isPriceDrop(currentPaise: number, atAddPaise: number): boolean {
  if (!Number.isFinite(currentPaise) || !Number.isFinite(atAddPaise) || atAddPaise <= 0) return false;
  return currentPaise < atAddPaise * PRICE_DROP_RATIO;
}

/**
 * "Back in stock" badge. The full rule would compare stock at add-time against stock now; the schema
 * does not snapshot stock, so we approximate: the product is in stock now AND the owner registered a
 * stock alert for any of its variants (notified or not), which only happens while it was out of stock.
 */
export function isBackInStock(inStockNow: boolean, hasStockAlertForProduct: boolean): boolean {
  return inStockNow && hasStockAlertForProduct;
}

export interface StockedVariant {
  id: string;
  stock: number;
  is_default: boolean;
}

/** Default variant id: the flagged default, else the first variant. */
export function pickDefaultVariant<T extends StockedVariant>(variants: readonly T[]): T | null {
  if (variants.length === 0) return null;
  return variants.find((v) => v.is_default) ?? variants[0];
}

/** In stock if the chosen variant (when set and still present) has stock, otherwise if any variant does. */
export function wishlistInStock(variants: readonly StockedVariant[], variantId: string | null): boolean {
  if (variantId) {
    const v = variants.find((x) => x.id === variantId);
    if (v) return v.stock > 0;
  }
  return variants.some((v) => v.stock > 0);
}
