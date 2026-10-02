import type { PincodeRecord, Tier } from "./types";
import { tierHasFreeDelivery } from "@/lib/loyalty/tiers";

export const FREE_DELIVERY_THRESHOLD = 999 * 100;
export const DEFAULT_DELIVERY_FEE = 49 * 100;
export const COD_FEE = 40 * 100;
export const COD_LIMIT = 20_000 * 100;
export const SAME_DAY_FEE = 99 * 100;
export const NEXT_DAY_FEE = 69 * 100;

export type DeliverySlot = "standard" | "next_day" | "same_day";

export interface DeliveryQuote {
  fee: number;
  label: string;
  reason: "free_threshold" | "free_tier" | "free_pro" | "free_coupon" | "paid";
}

/**
 * Delivery fee for the standard slot. Free when the user is Pro, Silver+ tier, or the merchandise
 * value reaches the threshold; otherwise the pincode's fee (default ₹49).
 */
export function deliveryFee(
  merchandisePaise: number,
  tier: Tier,
  isPro: boolean,
  pincode: PincodeRecord | null,
  couponFreeDelivery = false,
): DeliveryQuote {
  if (couponFreeDelivery) return { fee: 0, label: "Free", reason: "free_coupon" };
  if (isPro) return { fee: 0, label: "Free", reason: "free_pro" };
  if (tierHasFreeDelivery(tier)) return { fee: 0, label: "Free", reason: "free_tier" };
  if (merchandisePaise >= FREE_DELIVERY_THRESHOLD) return { fee: 0, label: "Free", reason: "free_threshold" };
  const fee = pincode?.delivery_fee ?? DEFAULT_DELIVERY_FEE;
  return { fee, label: `₹${fee / 100}`, reason: "paid" };
}

/** Extra charge for faster slots; Platinum gets same-day free, Gold gets next-day free. */
export function slotSurcharge(slot: DeliverySlot, tier: Tier, isPro: boolean): number {
  if (slot === "standard") return 0;
  if (slot === "next_day") return tier === "gold" || tier === "platinum" || isPro ? 0 : NEXT_DAY_FEE;
  return tier === "platinum" ? 0 : SAME_DAY_FEE;
}

/** Slots available for a pincode; same-day only before 12 PM IST (PRD §8.5.5). */
export function availableSlots(pincode: PincodeRecord | null, now: Date = new Date()): DeliverySlot[] {
  const slots: DeliverySlot[] = ["standard"];
  if (!pincode) return slots;
  if (pincode.next_day) slots.push("next_day");
  const istHour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(now));
  if (pincode.same_day && istHour < 12) slots.push("same_day");
  return slots;
}

/** Estimated delivery date for a slot. */
export function estimatedDelivery(slot: DeliverySlot, pincode: PincodeRecord | null, now: Date = new Date()): Date {
  const days = slot === "same_day" ? 0 : slot === "next_day" ? 1 : (pincode?.standard_days ?? 4);
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function codFee(method: string | null): number {
  return method === "cod" ? COD_FEE : 0;
}
