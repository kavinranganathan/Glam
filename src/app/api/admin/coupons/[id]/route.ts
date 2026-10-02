import { ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { adminHandle, type IdCtx } from "@/lib/admin/route";
import { couponPatchSchema } from "@/lib/admin/schemas";
import { deleteCoupon, updateCoupon } from "@/lib/admin/service";

export const PATCH = adminHandle(async (req, ctx: IdCtx) => {
  const { id } = await ctx.params;
  return ok(await updateCoupon(id, await parseBody(req, couponPatchSchema)));
});

export const DELETE = adminHandle(async (_req, ctx: IdCtx) => {
  const { id } = await ctx.params;
  await deleteCoupon(id);
  return ok({ deleted: true });
});
