import type { Tier } from "@/lib/pricing/types";
import { pointsMultiplier } from "./tiers";

/** 1 point = ₹0.25 (PRD §8.11.2). */
export const POINT_VALUE_PAISE = 25;

/** Points earned on the eligible merchandise amount: 1 pt per ₹10 × tier multiplier, floored. */
export function pointsForOrder(eligiblePaise: number, tier: Tier): number {
  if (eligiblePaise <= 0) return 0;
  return Math.floor((eligiblePaise / 1000) * pointsMultiplier(tier));
}

/** Paise value of a points balance. */
export function pointsValue(points: number): number {
  return Math.max(0, Math.floor(points)) * POINT_VALUE_PAISE;
}

/** Maximum points redeemable against an amount: limited by balance and by the amount itself. */
export function redeemablePoints(balance: number, amountPaise: number): number {
  if (balance <= 0 || amountPaise <= 0) return 0;
  return Math.min(balance, Math.floor(amountPaise / POINT_VALUE_PAISE));
}

export const REVIEW_POINTS_WITH_PHOTO = 50;
export const REVIEW_POINTS_WITHOUT_PHOTO = 20;
export const REFERRAL_POINTS = 200;
export const REFERRAL_MIN_ORDER_PAISE = 500 * 100;
