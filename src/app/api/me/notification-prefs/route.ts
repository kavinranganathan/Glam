import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { requireUser } from "@/lib/auth/session";
import { serviceClient } from "@/lib/supabase/service";

const DEFAULT_PREFS = { orders: true, offers: true, reviews: true, loyalty: true, personalised: true };

/** Orders is transactional and cannot be switched off (PRD §8.12). */
const PatchSchema = z
  .object({ offers: z.boolean(), reviews: z.boolean(), loyalty: z.boolean(), personalised: z.boolean() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

export const GET = handle(async () => {
  const user = await requireUser();
  const { data } = await serviceClient().from("notification_prefs").select("*").eq("user_id", user.id).maybeSingle();
  return ok({ prefs: data ?? { user_id: user.id, ...DEFAULT_PREFS } });
});

export const PATCH = handle(async (req) => {
  const user = await requireUser();
  const body = await parseBody(req, PatchSchema);
  const db = serviceClient();
  const { data: existing } = await db.from("notification_prefs").select("*").eq("user_id", user.id).maybeSingle();
  const { data, error } = await db
    .from("notification_prefs")
    .upsert({ ...(existing ?? { ...DEFAULT_PREFS }), user_id: user.id, ...body, orders: true, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw error;
  return ok({ prefs: data });
});
