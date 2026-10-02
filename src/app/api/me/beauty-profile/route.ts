import { handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { requireUser } from "@/lib/auth/session";
import { serviceClient } from "@/lib/supabase/service";
import { BeautyProfileSchema, profileCompletion } from "@/lib/account/beauty-profile";

export const GET = handle(async () => {
  const user = await requireUser();
  const { data } = await serviceClient().from("beauty_profiles").select("*").eq("user_id", user.id).maybeSingle();
  return ok({ profile: data });
});

/** Upserts the beauty profile. First save with ≥1 answer grants the welcome coupon (PRD §8.1.4). */
export const PUT = handle(async (req) => {
  const user = await requireUser();
  const body = await parseBody(req, BeautyProfileSchema);
  const db = serviceClient();
  const completion = profileCompletion(body);
  const { data: existing } = await db.from("beauty_profiles").select("completed_at").eq("user_id", user.id).maybeSingle();
  const completedAt = existing?.completed_at ?? (completion > 0 ? new Date().toISOString() : null);
  const { error } = await db.from("beauty_profiles").upsert(
    {
      user_id: user.id,
      skin_type: body.skinType ?? null,
      skin_tone: body.skinTone ?? null,
      concerns: body.concerns ?? [],
      hair_type: body.hairType ?? null,
      shopping_for: body.shoppingFor ?? [],
      style_prefs: body.stylePrefs ?? [],
      budget: body.budget ?? null,
      completed_at: completedAt,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
  let couponCode: string | null = null;
  if (completion > 0) {
    const { data } = await db.rpc("grant_welcome_coupon", { p_user: user.id });
    couponCode = (data as string | null) ?? null;
  }
  return ok({ completion, couponCode, firstCompletion: !existing?.completed_at && completion > 0 });
});
