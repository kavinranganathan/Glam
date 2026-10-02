import type { CouponRecord, PricingContext, PricingLine, PricingLineInput } from "./types";

export type CouponValidation = { ok: true; discount: number; freeDelivery: boolean } | { ok: false; error: string };

/**
 * Validates a coupon against the cart and returns the discount in paise.
 * `lines` must already carry item-level discounts (lineTotal is post-BxGy).
 */
export function validateCoupon(
  coupon: CouponRecord,
  ctx: Pick<PricingContext, "isPro" | "couponUserUses" | "now">,
  lines: Array<PricingLine & Pick<PricingLineInput, "brandId" | "categoryPath">>,
): CouponValidation {
  const now = ctx.now ?? new Date();
  if (!coupon.is_active) return { ok: false, error: "This coupon is no longer active." };
  if (new Date(coupon.starts_at) > now) return { ok: false, error: "This coupon is not valid yet." };
  if (coupon.ends_at && new Date(coupon.ends_at) < now) return { ok: false, error: "This coupon has expired." };
  if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit) {
    return { ok: false, error: "This coupon has been fully redeemed." };
  }
  if (ctx.couponUserUses >= coupon.per_user_limit) {
    return { ok: false, error: "You have already used this coupon." };
  }
  if (coupon.pro_only && !ctx.isPro) return { ok: false, error: "This coupon is exclusive to GLAM Pro members." };

  const eligible = lines.filter((l) => {
    if (coupon.scope === "all") return true;
    if (coupon.scope === "brand") return l.brandId === coupon.scope_id;
    return l.categoryPath.includes(coupon.scope_id ?? "");
  });
  const eligibleTotal = eligible.reduce((s, l) => s + l.lineTotal, 0);
  const cartTotal = lines.reduce((s, l) => s + l.lineTotal, 0);

  if (eligible.length === 0) {
    return { ok: false, error: coupon.scope === "brand" ? "Add eligible brand products to use this coupon." : "Add eligible products to use this coupon." };
  }
  if (cartTotal < coupon.min_order) {
    return { ok: false, error: `Add items worth ₹${Math.ceil((coupon.min_order - cartTotal) / 100)} more to use this coupon.` };
  }

  if (coupon.kind === "free_delivery") return { ok: true, discount: 0, freeDelivery: true };
  if (coupon.kind === "flat") {
    return { ok: true, discount: Math.min(coupon.value, eligibleTotal), freeDelivery: false };
  }
  let discount = Math.round((eligibleTotal * coupon.value) / 100);
  if (coupon.max_discount != null) discount = Math.min(discount, coupon.max_discount);
  return { ok: true, discount: Math.min(discount, eligibleTotal), freeDelivery: false };
}

/** Human description used in coupon lists. */
export function describeCoupon(c: CouponRecord): string {
  if (c.description) return c.description;
  if (c.kind === "free_delivery") return "Free delivery";
  if (c.kind === "flat") return `₹${c.value / 100} off`;
  return `${c.value}% off${c.max_discount ? ` (max ₹${c.max_discount / 100})` : ""}`;
}
