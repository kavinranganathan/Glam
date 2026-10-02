import "server-only";

import { serviceClient } from "@/lib/supabase/service";
import type { Tables } from "@/lib/supabase/types";
import type { Tier } from "@/lib/pricing/types";
import { TIER_THRESHOLDS, nextTier, tierForSpend, tierProgress } from "./tiers";
import { pointsValue } from "./points";
import { expiringSoon } from "./rules";

export type LedgerRow = Tables<"points_ledger">;

export interface RewardsSummary {
  pointsBalance: number;
  /** Paise value of the balance (1 pt = ₹0.25). */
  pointsValuePaise: number;
  walletBalance: number;
  spend12m: number;
  tier: Tier;
  nextTier: { tier: Tier; remaining: number } | null;
  progress: number;
  tierThreshold: number;
  expiringSoon: LedgerRow[];
  referralCode: string;
  isPro: boolean;
  proUntil: string | null;
}

/** Rolling 12-month paid spend via the DB function, falling back to lifetime spend if the RPC is unavailable. */
export async function getSpend12m(userId: string, fallback: number): Promise<number> {
  const { data, error } = await serviceClient().rpc("user_spend_12m", { p_user: userId });
  if (error || typeof data !== "number") return fallback;
  return data;
}

export async function getRewardsSummary(userId: string): Promise<RewardsSummary> {
  const db = serviceClient();
  const { data: profile, error } = await db
    .from("profiles")
    .select("points_balance, wallet_balance, lifetime_spend, referral_code, pro_until")
    .eq("id", userId)
    .single();
  if (error) throw error;
  const [spend12m, ledger] = await Promise.all([
    getSpend12m(userId, profile.lifetime_spend),
    db
      .from("points_ledger")
      .select("*")
      .eq("user_id", userId)
      .gt("delta", 0)
      .not("expires_at", "is", null)
      .order("expires_at", { ascending: true })
      .limit(50),
  ]);
  const tier = tierForSpend(spend12m);
  return {
    pointsBalance: profile.points_balance,
    pointsValuePaise: pointsValue(profile.points_balance),
    walletBalance: profile.wallet_balance,
    spend12m,
    tier,
    nextTier: nextTier(spend12m),
    progress: tierProgress(spend12m),
    tierThreshold: TIER_THRESHOLDS[tier],
    expiringSoon: expiringSoon(ledger.data ?? []),
    referralCode: profile.referral_code,
    isPro: Boolean(profile.pro_until && new Date(profile.pro_until) > new Date()),
    proUntil: profile.pro_until,
  };
}

export const HISTORY_PAGE_SIZE = 20;

export interface PointsHistoryPage {
  rows: LedgerRow[];
  page: number;
  hasMore: boolean;
}

/** Points ledger, newest first, 20 per page (1-based). */
export async function getPointsHistory(userId: string, page = 1): Promise<PointsHistoryPage> {
  const p = Math.max(1, Math.floor(page));
  const from = (p - 1) * HISTORY_PAGE_SIZE;
  const { data, error } = await serviceClient()
    .from("points_ledger")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, from + HISTORY_PAGE_SIZE);
  if (error) throw error;
  const rows = data ?? [];
  return { rows: rows.slice(0, HISTORY_PAGE_SIZE), page: p, hasMore: rows.length > HISTORY_PAGE_SIZE };
}
