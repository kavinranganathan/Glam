import type { Tier } from "@/lib/pricing/types";

/** Rolling 12-month spend thresholds in paise (PRD §8.11.1). */
export const TIER_THRESHOLDS: Record<Tier, number> = {
  base: 0,
  silver: 10_000 * 100,
  gold: 30_000 * 100,
  platinum: 75_000 * 100,
};

export const TIER_ORDER: Tier[] = ["base", "silver", "gold", "platinum"];

export const TIER_LABEL: Record<Tier, string> = {
  base: "Base",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

export const TIER_BENEFITS: Record<Tier, string[]> = {
  base: ["1 point per ₹10 spent", "Birthday bonus", "Welcome coupon"],
  silver: ["1.5× points", "Free standard delivery on all orders", "Early sale access (24h)"],
  gold: ["2× points", "Free express delivery", "Priority support", "Exclusive Gold-only launches"],
  platinum: ["3× points", "Free same-day delivery", "Dedicated beauty advisor", "VIP event invites", "Quarterly gift box"],
};

export function tierForSpend(spendPaise: number): Tier {
  if (spendPaise >= TIER_THRESHOLDS.platinum) return "platinum";
  if (spendPaise >= TIER_THRESHOLDS.gold) return "gold";
  if (spendPaise >= TIER_THRESHOLDS.silver) return "silver";
  return "base";
}

export function pointsMultiplier(tier: Tier): number {
  switch (tier) {
    case "platinum":
      return 3;
    case "gold":
      return 2;
    case "silver":
      return 1.5;
    default:
      return 1;
  }
}

/** Next tier and the spend still needed to reach it; null when already Platinum. */
export function nextTier(spendPaise: number): { tier: Tier; remaining: number } | null {
  const current = tierForSpend(spendPaise);
  const idx = TIER_ORDER.indexOf(current);
  if (idx === TIER_ORDER.length - 1) return null;
  const next = TIER_ORDER[idx + 1];
  return { tier: next, remaining: Math.max(0, TIER_THRESHOLDS[next] - spendPaise) };
}

/** Progress (0–1) from the current tier threshold towards the next tier. 1 at Platinum. */
export function tierProgress(spendPaise: number): number {
  const current = tierForSpend(spendPaise);
  const n = nextTier(spendPaise);
  if (!n) return 1;
  const from = TIER_THRESHOLDS[current];
  const to = TIER_THRESHOLDS[n.tier];
  return Math.min(1, Math.max(0, (spendPaise - from) / (to - from)));
}

/** Tier implies free delivery (Silver and above). */
export function tierHasFreeDelivery(tier: Tier): boolean {
  return tier !== "base";
}
