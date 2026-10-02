/** Pure cart rules shared by the cart service, the guest-cart merge and their tests. No I/O. */

/** Hard per-line quantity cap (also enforced by the `cart_items.qty` check constraint). */
export const MAX_LINE_QTY = 10;

/** Quantity after merging two carts' lines for the same variant: summed, never above the cap. */
export function mergeQuantities(a: number, b: number, cap: number = MAX_LINE_QTY): number {
  const sum = Math.max(0, Math.floor(a)) + Math.max(0, Math.floor(b));
  return Math.max(0, Math.min(cap, sum));
}

/**
 * Quantity the shopper can actually buy right now: bounded by the cap and by available stock.
 * Returns 0 when the variant is out of stock, so callers can keep the line visible as "out of stock".
 */
export function effectiveQty(requestedQty: number, stock: number, cap: number = MAX_LINE_QTY): number {
  const want = Math.max(0, Math.floor(requestedQty));
  return Math.max(0, Math.min(want, cap, Math.max(0, Math.floor(stock))));
}

/** Highest quantity a line may be set to: min(cap, stock), never negative. */
export function maxQtyFor(stock: number, cap: number = MAX_LINE_QTY): number {
  return Math.max(0, Math.min(cap, Math.floor(stock)));
}

export interface CategoryNode {
  id: string;
  parent_id: string | null;
}

/**
 * Category id chain from the leaf up to the root (leaf first), used for category-scoped coupons.
 * Unknown ids still yield `[categoryId]`; cycles and over-long chains are cut off defensively.
 */
export function buildCategoryPath(categoryId: string, categoriesById: ReadonlyMap<string, CategoryNode>): string[] {
  const path: string[] = [];
  const seen = new Set<string>();
  let cursor: string | null = categoryId;
  while (cursor && !seen.has(cursor) && path.length < 32) {
    seen.add(cursor);
    path.push(cursor);
    const node: CategoryNode | undefined = categoriesById.get(cursor);
    cursor = node?.parent_id ?? null;
  }
  return path;
}

/** Coupon codes are stored and compared case-insensitively; this is the canonical stored form. */
export function normaliseCouponCode(code: string): string {
  return code.trim().toUpperCase();
}
