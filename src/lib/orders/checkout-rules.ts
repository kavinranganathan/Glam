/** Pure checkout rules shared by the orders service, the checkout UI and tests. No I/O. */

import type { CartItemView, CartView } from "@/lib/cart/types";
import { EMI_MIN_PAISE } from "@/lib/payments/provider";
import { COD_LIMIT } from "@/lib/pricing/delivery";
import type { DeliverySlot } from "@/lib/pricing/delivery";
import type { PaymentMethod, PricingResult } from "@/lib/pricing/types";
import { formatINR } from "@/lib/utils/money";
import type { AddressSnapshot } from "./address";

export interface CodPincode {
  cod_available: boolean;
}

export interface MethodCheck {
  ok: boolean;
  reason: string | null;
}

/** COD needs a serviceable pincode that supports it and an order total within the ₹20,000 limit. */
export function canUseCod(totalPaise: number, pincode: CodPincode | null): MethodCheck {
  if (!pincode) return { ok: false, reason: "Add a serviceable delivery address to pay on delivery." };
  if (!pincode.cod_available) return { ok: false, reason: "Cash on Delivery is not available for this pincode." };
  if (totalPaise > COD_LIMIT) return { ok: false, reason: `Cash on Delivery is available for orders up to ${formatINR(COD_LIMIT)}.` };
  return { ok: true, reason: null };
}

export function canUseEmi(totalPaise: number): MethodCheck {
  if (totalPaise < EMI_MIN_PAISE) return { ok: false, reason: `EMI is available on orders of ${formatINR(EMI_MIN_PAISE)} or more.` };
  return { ok: true, reason: null };
}

/** Why a payment method cannot be used for this order, or null when it can. */
export function paymentMethodIssue(method: PaymentMethod, totalPaise: number, pincode: CodPincode | null): string | null {
  if (method === "cod") return canUseCod(totalPaise, pincode).reason;
  if (method === "emi") return canUseEmi(totalPaise).reason;
  if (method === "giftcard") return "Gift cards are coming soon.";
  return null;
}

/** Adds a faster-slot surcharge on top of the engine's delivery fee and total. */
export function applySlotSurcharge(pricing: PricingResult, surchargePaise: number): PricingResult {
  if (surchargePaise <= 0) return pricing;
  const deliveryFee = pricing.deliveryFee + surchargePaise;
  return { ...pricing, deliveryFee, deliveryLabel: formatINR(deliveryFee), total: pricing.total + surchargePaise, freeDeliveryGap: 0 };
}

/**
 * Restricts a bag to the given lines (buy-now). Saved-for-later lines are dropped. Pricing is NOT
 * recomputed here; the caller re-prices the subset.
 */
export function filterCartForBuyNow(cart: CartView, onlyItemIds?: readonly string[] | null): CartView {
  if (!onlyItemIds || onlyItemIds.length === 0) return cart;
  const wanted = new Set(onlyItemIds);
  const items = cart.items.filter((i) => wanted.has(i.id));
  return { ...cart, items, saved: [], itemCount: items.reduce((s, i) => s + i.qty, 0) };
}

/** Splits active lines into those that can be bought now and those currently out of stock. */
export function splitPurchasable(items: readonly CartItemView[]): { purchasable: CartItemView[]; outOfStock: CartItemView[] } {
  const purchasable: CartItemView[] = [];
  const outOfStock: CartItemView[] = [];
  for (const it of items) (it.maxQty > 0 && it.stock > 0 ? purchasable : outOfStock).push(it);
  return { purchasable, outOfStock };
}

export interface OrderPayloadItem {
  variant_id: string;
  qty: number;
  unit_price: number;
  mrp: number;
  line_total: number;
}

/** Exact shape expected by the `place_order(p_user, p_session, p_payload)` SQL function. */
export interface OrderPayload {
  items: OrderPayloadItem[];
  address: AddressSnapshot;
  pricing: {
    subtotal: number;
    item_discount: number;
    coupon_code: string | null;
    coupon_discount: number;
    points_redeemed: number;
    points_discount: number;
    delivery_fee: number;
    cod_fee: number;
    tax: number;
    total: number;
  };
  payment_method: PaymentMethod;
  delivery_slot: DeliverySlot;
  /** YYYY-MM-DD */
  estimated_delivery: string;
  guest_email: string | null;
  cart_item_ids?: string[];
}

export function buildOrderPayload(input: {
  items: readonly CartItemView[];
  pricing: PricingResult;
  address: AddressSnapshot;
  paymentMethod: PaymentMethod;
  slot: DeliverySlot;
  estimatedDelivery: Date;
  guestEmail?: string | null;
  cartItemIds?: readonly string[] | null;
}): OrderPayload {
  const priced = new Map(input.pricing.lines.map((l) => [l.cartItemId ?? l.variantId, l]));
  const items = input.items.map((it) => {
    const line = priced.get(it.id) ?? priced.get(it.variantId);
    const qty = line?.qty ?? it.qty;
    const unit = line?.unitPrice ?? it.unitPrice;
    return { variant_id: it.variantId, qty, unit_price: unit, mrp: it.mrp, line_total: line?.lineTotal ?? unit * qty };
  });
  const p = input.pricing;
  const payload: OrderPayload = {
    items,
    address: input.address,
    pricing: {
      subtotal: p.subtotal,
      item_discount: p.itemDiscount,
      coupon_code: p.couponCode,
      coupon_discount: p.couponDiscount,
      points_redeemed: p.pointsRedeemed,
      points_discount: p.pointsDiscount,
      delivery_fee: p.deliveryFee,
      cod_fee: p.codFee,
      tax: p.tax,
      total: p.total,
    },
    payment_method: input.paymentMethod,
    delivery_slot: input.slot,
    estimated_delivery: input.estimatedDelivery.toISOString().slice(0, 10),
    guest_email: input.guestEmail ?? null,
  };
  if (input.cartItemIds && input.cartItemIds.length > 0) payload.cart_item_ids = [...input.cartItemIds];
  return payload;
}

/** Total after switching payment method: COD adds its fee once, any other method removes it. */
export function totalForMethod(total: number, currentCodFee: number, method: PaymentMethod, codFee: number): { total: number; codFee: number } {
  const base = total - currentCodFee;
  const fee = method === "cod" ? codFee : 0;
  return { total: base + fee, codFee: fee };
}
