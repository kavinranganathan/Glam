import { z } from "zod";
import { ApiError, handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { requireUser } from "@/lib/auth/session";
import { serviceClient } from "@/lib/supabase/service";

const bodySchema = z.object({ variantId: z.uuid() });

/** "Notify me" on an out-of-stock variant. Idempotent per user + variant. */
export const POST = handle(async (req) => {
  const { variantId } = await parseBody(req, bodySchema);
  const user = await requireUser();
  const db = serviceClient();
  const { data: variant } = await db.from("variants").select("id").eq("id", variantId).maybeSingle();
  if (!variant) throw new ApiError(404, "VARIANT_NOT_FOUND", "This item is no longer available.");
  const { error } = await db.from("stock_alerts").upsert({ user_id: user.id, variant_id: variantId }, { onConflict: "user_id,variant_id", ignoreDuplicates: true });
  if (error) throw new ApiError(500, "STOCK_ALERT_FAILED", "Could not set the alert. Please try again.");
  return ok({ subscribed: true }, { status: 201 });
});
