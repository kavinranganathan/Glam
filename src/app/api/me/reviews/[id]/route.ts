import { z } from "zod";
import { ApiError, handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { requireUser } from "@/lib/auth/session";
import { canEditReview } from "@/lib/loyalty/rules";
import { serviceClient } from "@/lib/supabase/service";

type Ctx = { params: Promise<{ id: string }> };

const PatchSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    title: z.string().trim().max(120).nullable(),
    body: z.string().trim().min(30).max(2000),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

async function ownedReview(userId: string, id: string) {
  const { data, error } = await serviceClient().from("reviews").select("id, product_id, created_at").eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "NOT_FOUND", "Review not found.");
  if (!canEditReview(data.created_at)) throw new ApiError(409, "EDIT_WINDOW_CLOSED", "Reviews can be edited or deleted within 7 days of posting.");
  return data;
}

/** Edit rating / title / body within 7 days, then recompute the product rating. */
export const PATCH = handle<Ctx>(async (req, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const body = await parseBody(req, PatchSchema);
  const review = await ownedReview(user.id, id);
  const db = serviceClient();
  const { data, error } = await db.from("reviews").update(body).eq("id", review.id).select("*").single();
  if (error) throw error;
  await db.rpc("recompute_product_rating", { p_product: review.product_id });
  return ok({ review: data });
});

export const DELETE = handle<Ctx>(async (_req, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const review = await ownedReview(user.id, id);
  const db = serviceClient();
  const { error } = await db.from("reviews").delete().eq("id", review.id);
  if (error) throw error;
  await db.rpc("recompute_product_rating", { p_product: review.product_id });
  return ok({ deleted: true });
});
