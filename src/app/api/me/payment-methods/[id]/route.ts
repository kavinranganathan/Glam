import { ApiError, handle, ok } from "@/lib/api/respond";
import { requireUser } from "@/lib/auth/session";
import { serviceClient } from "@/lib/supabase/service";

export const DELETE = handle<{ params: Promise<{ id: string }> }>(async (_req, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const { data, error } = await serviceClient()
    .from("saved_payment_methods")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "NOT_FOUND", "Saved payment method not found.");
  return ok({ deleted: true });
});
