import "server-only";

import { ApiError } from "@/lib/api/respond";
import { buildCategoryPath, effectiveQty, type CategoryNode } from "@/lib/cart/rules";
import type { CartIdentity, CartView } from "@/lib/cart/types";
import { getActiveFlashSale } from "@/lib/catalogue/queries";
import { priceCart } from "@/lib/pricing/engine";
import type { CouponRecord, PaymentMethod, PincodeRecord, PricingLineInput, PricingResult, Tier } from "@/lib/pricing/types";
import { serviceClient } from "@/lib/supabase/service";
import type { Tables } from "@/lib/supabase/types";

const TIERS: readonly Tier[] = ["base", "silver", "gold", "platinum"];

const LINE_SELECT = `id, qty, saved_for_later,
  variants!inner(id, product_id, sku, price, mrp, stock,
    products!inner(id, brand_id, category_id, pro_price, offer_type, offer_buy, offer_get))` as const;

type LineRow = Pick<Tables<"cart_items">, "id" | "qty" | "saved_for_later"> & {
  variants: Pick<Tables<"variants">, "id" | "product_id" | "sku" | "price" | "mrp" | "stock"> & {
    products: Pick<Tables<"products">, "id" | "brand_id" | "category_id" | "pro_price" | "offer_type" | "offer_buy" | "offer_get">;
  };
};

/**
 * Re-prices a subset of the bag (buy-now). `getCartView` prices the whole bag and keeps its pricing
 * inputs private, so the lines are reloaded here and priced with the same engine and the shopper
 * context already resolved on the full view (Pro, tier, points, coupon, points toggle).
 */
export async function priceCartSubset(
  identity: CartIdentity,
  cart: CartView,
  itemIds: readonly string[],
  opts: { pincode: PincodeRecord | null; paymentMethod: PaymentMethod | null },
): Promise<PricingResult> {
  const db = serviceClient();
  const [linesRes, flash, catsRes, coupon] = await Promise.all([
    db.from("cart_items").select(LINE_SELECT).eq("cart_id", cart.id).in("id", [...itemIds]),
    getActiveFlashSale(),
    db.from("categories").select("id, parent_id"),
    cart.couponCode ? loadCoupon(cart.couponCode, identity) : Promise.resolve(null),
  ]);
  if (linesRes.error) throw new ApiError(500, "CART_UNAVAILABLE", "Could not load your bag. Please try again.");
  const categories = new Map<string, CategoryNode>((catsRes.data ?? []).map((c) => [c.id, c]));

  const lines: PricingLineInput[] = [];
  for (const r of linesRes.data as unknown as LineRow[]) {
    if (r.saved_for_later) continue;
    const qty = effectiveQty(r.qty, r.variants.stock);
    if (qty === 0) continue;
    const p = r.variants.products;
    lines.push({
      cartItemId: r.id,
      variantId: r.variants.id,
      productId: p.id,
      sku: r.variants.sku,
      qty,
      price: r.variants.price,
      mrp: r.variants.mrp,
      proPrice: p.pro_price,
      flashPrice: flash?.prices.get(p.id) ?? null,
      offerType: p.offer_type,
      offerBuy: p.offer_buy,
      offerGet: p.offer_get,
      brandId: p.brand_id,
      categoryId: p.category_id,
      categoryPath: buildCategoryPath(p.category_id, categories),
    });
  }

  const couponUserUses = coupon && identity.user ? await countRedemptions(coupon.id, identity.user.id) : 0;
  const tier = TIERS.find((t) => t === cart.tier) ?? "base";
  return priceCart(lines, {
    isPro: cart.isPro,
    tier,
    pointsBalance: cart.pointsBalance,
    usePoints: cart.usePoints && Boolean(identity.user),
    coupon,
    couponUserUses,
    pincode: opts.pincode,
    paymentMethod: opts.paymentMethod,
  });
}

async function loadCoupon(code: string, identity: CartIdentity): Promise<(CouponRecord & { id: string }) | null> {
  const pattern = code.trim().replace(/[\\%_]/g, (m) => `\\${m}`);
  const { data } = await serviceClient().from("coupons").select("*").ilike("code", pattern).limit(1).maybeSingle();
  if (!data || (data.user_id && data.user_id !== identity.user?.id)) return null;
  return data;
}

async function countRedemptions(couponId: string, userId: string): Promise<number> {
  const { count } = await serviceClient().from("coupon_redemptions").select("id", { count: "exact", head: true }).eq("coupon_id", couponId).eq("user_id", userId);
  return count ?? 0;
}
