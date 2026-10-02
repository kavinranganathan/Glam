import { describe, expect, it } from "vitest";
import type { CartItemView, CartView } from "@/lib/cart/types";
import { EMI_MIN_PAISE } from "@/lib/payments/provider";
import { COD_FEE, COD_LIMIT } from "@/lib/pricing/delivery";
import type { PricingResult } from "@/lib/pricing/types";
import {
  applySlotSurcharge,
  buildOrderPayload,
  canUseCod,
  canUseEmi,
  filterCartForBuyNow,
  paymentMethodIssue,
  splitPurchasable,
  totalForMethod,
} from "@/lib/orders/checkout-rules";

function item(over: Partial<CartItemView> = {}): CartItemView {
  return {
    id: "item-1",
    variantId: "var-1",
    productId: "prod-1",
    slug: "serum",
    name: "Vitamin C Serum",
    brandName: "Glow",
    variantName: "30ml",
    variantKind: "size",
    shadeHex: null,
    image: "",
    qty: 2,
    unitPrice: 50000,
    mrp: 60000,
    lineTotal: 100000,
    priceSource: "base",
    offerLabel: null,
    stock: 5,
    maxQty: 5,
    savedForLater: false,
    nonReturnable: false,
    estimatedDelivery: null,
    ...over,
  };
}

function pricing(over: Partial<PricingResult> = {}): PricingResult {
  return {
    lines: [{ cartItemId: "item-1", variantId: "var-1", qty: 2, unitPrice: 50000, mrp: 60000, lineTotal: 100000, lineDiscount: 0, priceSource: "base", offerLabel: null }],
    subtotal: 100000,
    itemDiscount: 0,
    couponCode: null,
    couponDiscount: 0,
    couponError: null,
    pointsRedeemed: 0,
    pointsDiscount: 0,
    deliveryFee: 0,
    deliveryLabel: "Free",
    codFee: 0,
    tax: 0,
    total: 100000,
    pointsToEarn: 100,
    totalSavings: 20000,
    proSavings: 0,
    freeDeliveryGap: 0,
    ...over,
  };
}

function cart(items: CartItemView[], saved: CartItemView[] = []): CartView {
  return {
    id: "cart-1",
    items,
    saved,
    pricing: pricing(),
    couponCode: null,
    couponDescription: null,
    usePoints: false,
    pointsBalance: 0,
    itemCount: items.reduce((s, i) => s + i.qty, 0),
    isPro: false,
    tier: "base",
  };
}

describe("canUseCod", () => {
  it("needs a serviceable pincode with COD and a total within the limit", () => {
    expect(canUseCod(100000, { cod_available: true }).ok).toBe(true);
    expect(canUseCod(COD_LIMIT, { cod_available: true }).ok).toBe(true);
    expect(canUseCod(COD_LIMIT + 1, { cod_available: true })).toEqual({ ok: false, reason: expect.stringContaining("₹20,000") });
    expect(canUseCod(100000, { cod_available: false }).reason).toMatch(/not available for this pincode/);
    expect(canUseCod(100000, null).ok).toBe(false);
  });
});

describe("canUseEmi / paymentMethodIssue", () => {
  it("gates EMI on the minimum amount", () => {
    expect(canUseEmi(EMI_MIN_PAISE).ok).toBe(true);
    expect(canUseEmi(EMI_MIN_PAISE - 1).ok).toBe(false);
  });
  it("only blocks the methods with rules", () => {
    expect(paymentMethodIssue("upi", 1, null)).toBeNull();
    expect(paymentMethodIssue("card", 1, null)).toBeNull();
    expect(paymentMethodIssue("cod", 1, { cod_available: true })).toBeNull();
    expect(paymentMethodIssue("cod", 1, null)).not.toBeNull();
    expect(paymentMethodIssue("emi", 1, null)).not.toBeNull();
    expect(paymentMethodIssue("giftcard", 1, null)).not.toBeNull();
  });
});

describe("applySlotSurcharge", () => {
  it("adds the surcharge to the delivery fee and total", () => {
    const out = applySlotSurcharge(pricing({ deliveryFee: 0, deliveryLabel: "Free", total: 100000 }), 6900);
    expect(out.deliveryFee).toBe(6900);
    expect(out.deliveryLabel).toBe("₹69");
    expect(out.total).toBe(106900);
    expect(out.freeDeliveryGap).toBe(0);
  });
  it("is a no-op for zero surcharge", () => {
    const p = pricing();
    expect(applySlotSurcharge(p, 0)).toBe(p);
  });
});

describe("filterCartForBuyNow", () => {
  const a = item({ id: "a", qty: 1 });
  const b = item({ id: "b", variantId: "var-2", qty: 3 });
  it("keeps only the requested lines and drops saved items", () => {
    const out = filterCartForBuyNow(cart([a, b], [item({ id: "s" })]), ["b"]);
    expect(out.items.map((i) => i.id)).toEqual(["b"]);
    expect(out.saved).toEqual([]);
    expect(out.itemCount).toBe(3);
  });
  it("returns the cart untouched without ids", () => {
    const c = cart([a, b]);
    expect(filterCartForBuyNow(c, null)).toBe(c);
    expect(filterCartForBuyNow(c, [])).toBe(c);
  });
});

describe("splitPurchasable", () => {
  it("separates out-of-stock lines", () => {
    const { purchasable, outOfStock } = splitPurchasable([item({ id: "ok" }), item({ id: "oos", stock: 0, maxQty: 0 })]);
    expect(purchasable.map((i) => i.id)).toEqual(["ok"]);
    expect(outOfStock.map((i) => i.id)).toEqual(["oos"]);
  });
});

describe("buildOrderPayload", () => {
  const address = { label: "Home", name: "Priya", phone: "9876543210", line1: "12 MG Road", line2: null, landmark: null, city: "Bengaluru", state: "Karnataka", pincode: "560001" };
  it("matches the place_order contract", () => {
    const payload = buildOrderPayload({
      items: [item()],
      pricing: pricing({ couponCode: "WELCOME10", couponDiscount: 10000, total: 90000 }),
      address,
      paymentMethod: "upi",
      slot: "next_day",
      estimatedDelivery: new Date("2026-10-03T10:00:00Z"),
    });
    expect(payload.items).toEqual([{ variant_id: "var-1", qty: 2, unit_price: 50000, mrp: 60000, line_total: 100000 }]);
    expect(payload.pricing).toEqual({
      subtotal: 100000,
      item_discount: 0,
      coupon_code: "WELCOME10",
      coupon_discount: 10000,
      points_redeemed: 0,
      points_discount: 0,
      delivery_fee: 0,
      cod_fee: 0,
      tax: 0,
      total: 90000,
    });
    expect(payload.payment_method).toBe("upi");
    expect(payload.delivery_slot).toBe("next_day");
    expect(payload.estimated_delivery).toBe("2026-10-03");
    expect(payload.guest_email).toBeNull();
    expect(payload).not.toHaveProperty("cart_item_ids");
  });
  it("includes cart_item_ids for buy-now and the guest email", () => {
    const payload = buildOrderPayload({
      items: [item()],
      pricing: pricing(),
      address,
      paymentMethod: "cod",
      slot: "standard",
      estimatedDelivery: new Date("2026-10-06T00:00:00Z"),
      guestEmail: "guest@example.com",
      cartItemIds: ["item-1"],
    });
    expect(payload.cart_item_ids).toEqual(["item-1"]);
    expect(payload.guest_email).toBe("guest@example.com");
  });
});

describe("totalForMethod", () => {
  it("adds and removes the COD fee exactly once", () => {
    expect(totalForMethod(100000, 0, "cod", COD_FEE)).toEqual({ total: 104000, codFee: 4000 });
    expect(totalForMethod(104000, 4000, "upi", COD_FEE)).toEqual({ total: 100000, codFee: 0 });
    expect(totalForMethod(104000, 4000, "cod", COD_FEE)).toEqual({ total: 104000, codFee: 4000 });
  });
});
