import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { requireUser } from "@/lib/auth/session";
import { getSpend12m } from "@/lib/loyalty/service";
import { TIER_LABEL, tierForSpend } from "@/lib/loyalty/tiers";
import { serviceClient } from "@/lib/supabase/service";

const PatchSchema = z
  .object({
    name: z.string().trim().min(2).max(60).nullable(),
    phone: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number")
      .nullable(),
    dob: z.iso.date().nullable(),
    avatar_url: z.url().max(500).nullable(),
    marketing_consent: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

/** Profile summary for the signed-in user, including the loyalty tier. */
export const GET = handle(async () => {
  const user = await requireUser();
  const spend12m = await getSpend12m(user.id, user.lifetime_spend);
  const tier = tierForSpend(spend12m);
  return ok({
    id: user.id,
    name: user.name,
    email: user.email ?? user.authEmail,
    phone: user.phone,
    avatarUrl: user.avatar_url,
    dob: user.dob,
    role: user.role,
    marketingConsent: user.marketing_consent,
    referralCode: user.referral_code,
    pointsBalance: user.points_balance,
    walletBalance: user.wallet_balance,
    isPro: user.isPro,
    proUntil: user.pro_until,
    spend12m,
    tier,
    tierLabel: TIER_LABEL[tier],
  });
});

/** Updates editable profile fields (S36 Edit Profile + consent management). */
export const PATCH = handle(async (req) => {
  const user = await requireUser();
  const body = await parseBody(req, PatchSchema);
  const { data, error } = await serviceClient().from("profiles").update(body).eq("id", user.id).select("*").single();
  if (error) throw error;
  return ok({ profile: data });
});
