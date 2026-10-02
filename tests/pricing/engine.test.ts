import { describe, expect, it } from "vitest";
import { bxgyDiscount, priceCart, priceLine, unitPriceFor } from "@/lib/pricing/engine";
import type { CouponRecord, PincodeRecord, PricingContext, PricingLineInput } from "@/lib/pricing/types";

const line = (over: Partial<PricingLineInput> = {}): PricingLineInput => ({
  variantId: "v1",
  productId: "p1",
  sku: "GLM1000",
  qty: 1,
  price: 59900,
  mrp: 79900,
  proPrice: null,
  flashPrice: null,
  offerType: "none",
  offerBuy: 0,
  offerGet: 0,
  brandId: "b1",
  categoryId: "c-serums",
  categoryPath: ["c-serums", "c-skincare"],
  ...over,
});

const ctx = (over: Partial<PricingContext> = {}): PricingContext => ({
  isPro: false,
  tier: "base",
  pointsBalance: 0,
  usePoints: false,
  coupon: null,
  couponUserUses: 0,
  pincode: null,
  paymentMethod: "upi",
  now: new Date("2026-10-02T10:00:00Z"),
  ...over,
});

const coupon = (over: Partial<CouponRecord> = {}): CouponRecord => ({
  code: "TEST",
  kind: "percent",
  value: 10,
  max_discount: null,
  min_order: 0,
  scope: "all",
  scope_id: null,
  user_id: null,
  starts_at: "2026-01-01T00:00:00Z",
  ends_at: null,
  usage_limit: null,
  used_count: 0,
  per_user_limit: 1,
  pro_only: false,
  is_active: true,
  description: "",
  ...over,
});

const pin: PincodeRecord = { pincode: "400001", city: "Mumbai", state: "MH", same_day: true, next_day: true, delivery_fee: 4900, cod_available: true, standard_days: 2, courier: "Delhivery" };

describe("unitPriceFor", () => {
  it("uses base price by default", () => {
    expect(unitPriceFor(line(), false)).toEqual({ price: 59900, source: "base" });
  });
  it("uses Pro price only for Pro members and only when lower", () => {
    expect(unitPriceFor(line({ proPrice: 54900 }), true)).toEqual({ price: 54900, source: "pro" });
    expect(unitPriceFor(line({ proPrice: 54900 }), false).source).toBe("base");
    expect(unitPriceFor(line({ proPrice: 69900 }), true).source).toBe("base");
  });
  it("flash price beats Pro price", () => {
    expect(unitPriceFor(line({ proPrice: 54900, flashPrice: 41900 }), true)).toEqual({ price: 41900, source: "flash" });
  });
});

describe("bxgyDiscount", () => {
  it("gives Y free units per X+Y group", () => {
    expect(bxgyDiscount(3, 1000, 2, 1)).toEqual({ discount: 1000, freeUnits: 1 });
    expect(bxgyDiscount(2, 1000, 2, 1)).toEqual({ discount: 0, freeUnits: 0 });
    expect(bxgyDiscount(6, 1000, 2, 1)).toEqual({ discount: 2000, freeUnits: 2 });
  });
  it("is zero when the offer is malformed", () => {
    expect(bxgyDiscount(5, 1000, 0, 1).discount).toBe(0);
  });
});

describe("priceLine", () => {
  it("applies bxgy to the line total and labels it", () => {
    const l = priceLine(line({ qty: 3, offerType: "bxgy", offerBuy: 2, offerGet: 1 }), false);
    expect(l.lineTotal).toBe(59900 * 2);
    expect(l.lineDiscount).toBe(59900);
    expect(l.offerLabel).toContain("1 free");
  });
});

describe("priceCart", () => {
  it("computes subtotal, delivery fee and total for a small basket", () => {
    const r = priceCart([line()], ctx({ pincode: pin }));
    expect(r.subtotal).toBe(59900);
    expect(r.deliveryFee).toBe(4900);
    expect(r.deliveryLabel).toBe("₹49");
    expect(r.total).toBe(64800);
    expect(r.freeDeliveryGap).toBe(99900 - 59900);
    expect(r.pointsToEarn).toBe(59); // 1 per ₹10
  });

  it("gives free delivery at or above ₹999 merchandise value", () => {
    const r = priceCart([line({ qty: 2 })], ctx({ pincode: pin }));
    expect(r.deliveryFee).toBe(0);
    expect(r.freeDeliveryGap).toBe(0);
    expect(r.total).toBe(119800);
  });

  it("gives free delivery to Silver+ tiers and Pro members regardless of basket size", () => {
    expect(priceCart([line()], ctx({ tier: "silver" })).deliveryFee).toBe(0);
    expect(priceCart([line()], ctx({ isPro: true })).deliveryFee).toBe(0);
  });

  it("adds a ₹40 COD fee for cash on delivery only", () => {
    expect(priceCart([line()], ctx({ paymentMethod: "cod" })).codFee).toBe(4000);
    expect(priceCart([line()], ctx({ paymentMethod: "card" })).codFee).toBe(0);
  });

  it("applies a percent coupon with a cap", () => {
    const r = priceCart([line({ qty: 2 })], ctx({ coupon: coupon({ value: 20, max_discount: 15000 }) }));
    expect(r.couponDiscount).toBe(15000);
    expect(r.couponCode).toBe("TEST");
    expect(r.couponError).toBeNull();
    expect(r.total).toBe(119800 - 15000);
  });

  it("applies a flat coupon and reports min-order errors", () => {
    const ok = priceCart([line({ qty: 2 })], ctx({ coupon: coupon({ kind: "flat", value: 20000, min_order: 99900 }) }));
    expect(ok.couponDiscount).toBe(20000);
    const bad = priceCart([line()], ctx({ coupon: coupon({ kind: "flat", value: 20000, min_order: 99900 }) }));
    expect(bad.couponDiscount).toBe(0);
    expect(bad.couponError).toMatch(/Add items worth ₹400 more/);
  });

  it("rejects expired, not-started, exhausted, used-up and pro-only coupons", () => {
    const c = ctx;
    expect(priceCart([line()], c({ coupon: coupon({ ends_at: "2026-01-02T00:00:00Z" }) })).couponError).toMatch(/expired/);
    expect(priceCart([line()], c({ coupon: coupon({ starts_at: "2027-01-01T00:00:00Z" }) })).couponError).toMatch(/not valid yet/);
    expect(priceCart([line()], c({ coupon: coupon({ usage_limit: 5, used_count: 5 }) })).couponError).toMatch(/fully redeemed/);
    expect(priceCart([line()], c({ coupon: coupon({ per_user_limit: 1 }), couponUserUses: 1 })).couponError).toMatch(/already used/);
    expect(priceCart([line()], c({ coupon: coupon({ pro_only: true }) })).couponError).toMatch(/Pro/);
    expect(priceCart([line()], c({ coupon: coupon({ pro_only: true }), isPro: true })).couponError).toBeNull();
    expect(priceCart([line()], c({ coupon: coupon({ is_active: false }) })).couponError).toMatch(/no longer active/);
  });

  it("scopes coupons to brand or category and only discounts eligible lines", () => {
    const lines = [line(), line({ variantId: "v2", brandId: "b2", categoryPath: ["c-lips", "c-makeup"], price: 100000, mrp: 100000 })];
    const brand = priceCart(lines, ctx({ coupon: coupon({ scope: "brand", scope_id: "b2", value: 10 }) }));
    expect(brand.couponDiscount).toBe(10000);
    const cat = priceCart(lines, ctx({ coupon: coupon({ scope: "category", scope_id: "c-skincare", value: 10 }) }));
    expect(cat.couponDiscount).toBe(5990);
    const none = priceCart([line()], ctx({ coupon: coupon({ scope: "brand", scope_id: "b9" }) }));
    expect(none.couponError).toMatch(/eligible/);
  });

  it("free-delivery coupon waives the delivery fee", () => {
    const r = priceCart([line()], ctx({ pincode: pin, coupon: coupon({ kind: "free_delivery" }) }));
    expect(r.deliveryFee).toBe(0);
    expect(r.couponCode).toBe("TEST");
    expect(r.couponDiscount).toBe(0);
  });

  it("redeems points at ₹0.25 each, capped by balance and by the payable amount", () => {
    const r = priceCart([line()], ctx({ pointsBalance: 1000, usePoints: true, tier: "silver" }));
    expect(r.pointsRedeemed).toBe(1000);
    expect(r.pointsDiscount).toBe(25000);
    expect(r.total).toBe(59900 - 25000);
    const capped = priceCart([line({ price: 1000, mrp: 1000 })], ctx({ pointsBalance: 1000, usePoints: true, tier: "silver" }));
    expect(capped.pointsRedeemed).toBe(40);
    expect(capped.total).toBe(0);
    expect(priceCart([line()], ctx({ pointsBalance: 1000, usePoints: false })).pointsRedeemed).toBe(0);
  });

  it("earns points on merchandise after discounts with the tier multiplier, excluding fees", () => {
    const r = priceCart([line({ qty: 2 })], ctx({ tier: "gold", paymentMethod: "cod", coupon: coupon({ kind: "flat", value: 19800 }) }));
    // merchandise 119800 − 19800 = 100000 → ₹1000 → 100 pts × 2
    expect(r.pointsToEarn).toBe(200);
  });

  it("reports Pro savings and total savings vs MRP", () => {
    const r = priceCart([line({ proPrice: 54900, qty: 2 })], ctx({ isPro: true }));
    expect(r.proSavings).toBe(10000);
    expect(r.totalSavings).toBe(79900 * 2 - 54900 * 2);
  });

  it("handles an empty cart", () => {
    const r = priceCart([], ctx({ paymentMethod: "cod", pincode: pin }));
    expect(r.total).toBe(0);
    expect(r.deliveryFee).toBe(0);
    expect(r.codFee).toBe(0);
  });
});
