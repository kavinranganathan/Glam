import "server-only";

import { ApiError, mapDbError } from "@/lib/api/respond";
import { getCartView } from "@/lib/cart/service";
import { PAYMENT_METHODS_ORDERED } from "@/lib/payments/provider";
import { getPaymentProvider } from "@/lib/payments/simulated";
import { lookupPincode } from "@/lib/pincode/service";
import { availableSlots, COD_FEE, estimatedDelivery, slotSurcharge } from "@/lib/pricing/delivery";
import type { PaymentMethod, PincodeRecord, Tier } from "@/lib/pricing/types";
import { serviceClient } from "@/lib/supabase/service";
import type { Database, Tables } from "@/lib/supabase/types";
import type { Json } from "@/lib/supabase/types.generated";
import { addressSnapshot, type AddressSnapshot } from "./address";
import { getAddress } from "./addresses";
import { priceCartSubset } from "./buy-now";
import { applySlotSurcharge, buildOrderPayload, filterCartForBuyNow, paymentMethodIssue, splitPurchasable, totalForMethod } from "./checkout-rules";
import type { CheckoutIdentity, CheckoutQuote, PaymentOrderView, PaymentOutcome, PincodeSummary, PlaceOrderInput, PlaceOrderResult, QuoteOptions } from "./types";

export const MAX_PAYMENT_ATTEMPTS = 3;
const TIERS: readonly Tier[] = ["base", "silver", "gold", "platinum"];

export function confirmationUrl(orderId: string): string {
  return `/orders/${orderId}/confirmation`;
}

/* ------------------------------------------------------------------------------------------------
 * Quote
 * ---------------------------------------------------------------------------------------------- */

export async function quoteCheckout(identity: CheckoutIdentity, opts: QuoteOptions = {}): Promise<CheckoutQuote> {
  const wantedSlot = opts.slot ?? "standard";
  const paymentMethod = opts.paymentMethod ?? "upi";
  const onlyIds = opts.onlyItemIds && opts.onlyItemIds.length > 0 ? opts.onlyItemIds : null;

  const address = opts.addressId && identity.user ? await getAddress(identity.user.id, opts.addressId) : null;
  if (opts.addressId && identity.user && !address) throw new ApiError(404, "ADDRESS_NOT_FOUND", "That address no longer exists. Please choose another.");
  const pincodeStr = address?.pincode ?? opts.pincode ?? null;
  const pin = pincodeStr ? await lookupPincode(pincodeStr) : null;

  const full = await getCartView(identity, { pincode: pin?.pincode, paymentMethod });
  const cart = filterCartForBuyNow(full, onlyIds);
  if (onlyIds && cart.items.length === 0) throw new ApiError(404, "ITEM_NOT_FOUND", "That item is no longer in your bag.");
  const tier = TIERS.find((t) => t === cart.tier) ?? "base";

  const now = new Date();
  const open = availableSlots(pin, now);
  const slot = open.includes(wantedSlot) ? wantedSlot : "standard";
  const slots = open.map((s) => ({ slot: s, surcharge: slotSurcharge(s, tier, cart.isPro), estimatedDelivery: estimatedDelivery(s, pin, now).toISOString() }));

  const base = onlyIds ? await priceCartSubset(identity, full, onlyIds, { pincode: pin, paymentMethod }) : full.pricing;
  // Nothing priced (empty bag or every line out of stock): no delivery surcharge and no COD fee either.
  const pricing = base.lines.length > 0 ? applySlotSurcharge(base, slotSurcharge(slot, tier, cart.isPro)) : { ...base, codFee: 0, total: base.total - base.codFee };

  const warnings: string[] = [];
  const { purchasable, outOfStock } = splitPurchasable(cart.items);
  if (outOfStock.length) warnings.push(`${outOfStock.map((i) => i.name).join(", ")} ${outOfStock.length === 1 ? "is" : "are"} out of stock. Remove to continue.`);
  if (pincodeStr && !pin) warnings.push(`Sorry, we don't deliver to ${pincodeStr} yet.`);
  if (slot !== wantedSlot) warnings.push("That delivery slot is no longer available, so we switched you to standard delivery.");
  if (cart.couponCode && pricing.couponError) warnings.push(`Coupon ${cart.couponCode}: ${pricing.couponError}`);
  const paymentIssue = paymentMethodIssue(paymentMethod, pricing.total, pin);
  if (paymentIssue) warnings.push(paymentIssue);

  return {
    cart: { ...cart, pricing },
    pricing,
    slot,
    slots,
    estimatedDelivery: estimatedDelivery(slot, pin, now).toISOString(),
    paymentMethod,
    address,
    pincode: pincodeStr ? pincodeSummary(pincodeStr, pin, open) : null,
    warnings,
    paymentIssue,
    canPlace: purchasable.length > 0 && outOfStock.length === 0 && Boolean(pin) && !paymentIssue,
  };
}

function pincodeSummary(pincode: string, rec: PincodeRecord | null, open: readonly string[]): PincodeSummary {
  return {
    pincode,
    serviceable: Boolean(rec),
    city: rec?.city ?? null,
    state: rec?.state ?? null,
    codAvailable: Boolean(rec?.cod_available),
    sameDayCutoffPassed: Boolean(rec?.same_day) && !open.includes("same_day"),
  };
}

/* ------------------------------------------------------------------------------------------------
 * Place
 * ---------------------------------------------------------------------------------------------- */

type PlaceArgs = Database["public"]["Functions"]["place_order"]["Args"];

/** Validates, builds the `place_order` payload, runs the atomic RPC and opens a payment intent. */
export async function placeOrder(identity: CheckoutIdentity, input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const address = await resolveAddress(identity, input);
  const onlyIds = input.onlyItemIds && input.onlyItemIds.length > 0 ? input.onlyItemIds : null;
  const quote = await quoteCheckout(identity, {
    addressId: identity.user ? input.addressId : null,
    pincode: address.pincode,
    slot: input.slot,
    paymentMethod: input.paymentMethod,
    onlyItemIds: onlyIds,
  });

  if (!quote.pincode?.serviceable) throw new ApiError(422, "NOT_SERVICEABLE", `Sorry, we don't deliver to ${address.pincode} yet.`);
  const { purchasable, outOfStock } = splitPurchasable(quote.cart.items);
  if (purchasable.length === 0) throw new ApiError(400, "EMPTY_ORDER", "Your bag is empty.");
  if (outOfStock.length) throw new ApiError(409, "OUT_OF_STOCK", `${outOfStock.map((i) => i.name).join(", ")} just went out of stock. Please update your bag.`);
  if (quote.slot !== input.slot) throw new ApiError(409, "SLOT_UNAVAILABLE", "That delivery slot is no longer available. Please pick another.");
  if (quote.paymentIssue) throw new ApiError(400, "PAYMENT_METHOD_UNAVAILABLE", quote.paymentIssue);

  const payload = buildOrderPayload({
    items: purchasable,
    pricing: quote.pricing,
    address,
    paymentMethod: input.paymentMethod,
    slot: quote.slot,
    estimatedDelivery: new Date(quote.estimatedDelivery),
    guestEmail: identity.user ? null : (input.guestEmail ?? null),
    cartItemIds: onlyIds,
  });
  const args = {
    p_user: identity.user?.id ?? null,
    p_session: identity.user ? null : identity.sessionId,
    p_payload: payload as unknown as Json,
  } as unknown as PlaceArgs;
  const db = serviceClient();
  const { data, error } = await db.rpc("place_order", args);
  if (error) throw dbError(error.message);
  const result = data as { order_id: string; order_number: string };

  const intent = await getPaymentProvider().createIntent({
    orderId: result.order_id,
    orderNumber: result.order_number,
    amount: quote.pricing.total,
    method: input.paymentMethod,
    customerEmail: identity.email ?? input.guestEmail ?? null,
  });
  await db.from("payments").update({ provider_ref: intent.providerRef }).eq("order_id", result.order_id).eq("status", "initiated");

  return { orderId: result.order_id, orderNumber: result.order_number, redirectUrl: intent.redirectUrl, total: quote.pricing.total, paymentMethod: input.paymentMethod };
}

async function resolveAddress(identity: CheckoutIdentity, input: PlaceOrderInput): Promise<AddressSnapshot> {
  if (identity.user) {
    if (input.addressId) {
      const saved = await getAddress(identity.user.id, input.addressId);
      if (!saved) throw new ApiError(404, "ADDRESS_NOT_FOUND", "That address no longer exists. Please choose another.");
      return addressSnapshot(saved);
    }
    if (input.address) return addressSnapshot(input.address);
    throw new ApiError(422, "ADDRESS_REQUIRED", "Choose a delivery address.");
  }
  if (!input.address) throw new ApiError(422, "ADDRESS_REQUIRED", "Enter a delivery address.");
  if (!input.guestEmail) throw new ApiError(422, "EMAIL_REQUIRED", "Enter your email so we can send order updates.");
  return addressSnapshot(input.address);
}

function dbError(message: string): ApiError {
  const mapped = mapDbError(message);
  if (mapped) return new ApiError(mapped.status, mapped.code, mapped.message);
  console.error("[orders] rpc failed", message);
  return new ApiError(500, "ORDER_FAILED", "We couldn't place your order. Please try again.");
}

/* ------------------------------------------------------------------------------------------------
 * Payment
 * ---------------------------------------------------------------------------------------------- */

export async function confirmPayment(orderId: string, providerRef: string): Promise<PaymentOutcome> {
  const { error } = await serviceClient().rpc("confirm_payment", { p_order: orderId, p_ref: providerRef });
  if (error) throw dbError(error.message);
  const { data } = await serviceClient().from("orders").select("payment_status").eq("id", orderId).maybeSingle();
  const status = data?.payment_status ?? "paid";
  return { status, cancelled: false, attemptsLeft: 0, redirectUrl: confirmationUrl(orderId) };
}

/** Records a failed attempt; the third failure cancels the order and restores stock/points/coupon. */
export async function failPayment(orderId: string): Promise<PaymentOutcome> {
  const { data, error } = await serviceClient().rpc("fail_payment", { p_order: orderId });
  if (error) throw dbError(error.message);
  const r = data as { cancelled: boolean; attempts_left: number };
  return { status: r.cancelled ? "failed" : "pending", cancelled: r.cancelled, attemptsLeft: r.attempts_left, redirectUrl: null };
}

type OrderRow = Tables<"orders"> & { order_items: Array<{ qty: number }> };

/** The order if it belongs to this identity (user id, or guest session for guest orders). 404 otherwise. */
export async function getOrderForPayment(orderId: string, identity: CheckoutIdentity): Promise<PaymentOrderView> {
  return toPaymentView(await ownedOrder(orderId, identity));
}

async function ownedOrder(orderId: string, identity: CheckoutIdentity): Promise<OrderRow> {
  const { data } = await serviceClient().from("orders").select("*, order_items(qty)").eq("id", orderId).maybeSingle();
  const row = data as OrderRow | null;
  const owns = row && (row.user_id ? row.user_id === identity.user?.id : row.session_id === identity.sessionId);
  if (!row || !owns) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
  return row;
}

async function toPaymentView(o: OrderRow): Promise<PaymentOrderView> {
  const address = o.address as unknown as AddressSnapshot;
  const pin = await lookupPincode(address.pincode);
  const methodIssues: Partial<Record<PaymentMethod, string>> = {};
  for (const m of PAYMENT_METHODS_ORDERED) {
    const issue = paymentMethodIssue(m, totalForMethod(o.total, o.cod_fee, m, COD_FEE).total, pin);
    if (issue) methodIssues[m] = issue;
  }
  return {
    id: o.id,
    orderNumber: o.order_number,
    total: o.total,
    paymentMethod: o.payment_method,
    paymentStatus: o.payment_status,
    status: o.status,
    paymentAttempts: o.payment_attempts,
    attemptsLeft: Math.max(0, MAX_PAYMENT_ATTEMPTS - o.payment_attempts),
    deliverySlot: o.delivery_slot,
    estimatedDelivery: o.estimated_delivery,
    itemCount: o.order_items.reduce((s, i) => s + i.qty, 0),
    address,
    isGuest: !o.user_id,
    methodIssues,
  };
}

/** Switches method while payment is pending; COD fee is added/removed from the total and the open payment row. */
export async function changePaymentMethod(orderId: string, method: PaymentMethod, identity: CheckoutIdentity): Promise<PaymentOrderView> {
  const db = serviceClient();
  const o = await ownedOrder(orderId, identity);
  if (o.payment_status !== "pending" || o.status !== "placed") {
    throw new ApiError(409, "PAYMENT_LOCKED", "The payment method can no longer be changed for this order.");
  }
  if (method === o.payment_method) return toPaymentView(o);

  const address = o.address as unknown as AddressSnapshot;
  const pin = await lookupPincode(address.pincode);
  const next = totalForMethod(o.total, o.cod_fee, method, COD_FEE);
  const issue = paymentMethodIssue(method, next.total, pin);
  if (issue) throw new ApiError(400, "PAYMENT_METHOD_UNAVAILABLE", issue);

  const { error } = await db.from("orders").update({ payment_method: method, cod_fee: next.codFee, total: next.total }).eq("id", o.id);
  if (error) throw new ApiError(500, "ORDER_FAILED", "Could not change the payment method. Please try again.");
  const { data: open } = await db.from("payments").select("id").eq("order_id", o.id).eq("status", "initiated").order("attempt", { ascending: false }).limit(1).maybeSingle();
  if (open) await db.from("payments").update({ method, amount: next.total }).eq("id", open.id);
  return getOrderForPayment(orderId, identity);
}
