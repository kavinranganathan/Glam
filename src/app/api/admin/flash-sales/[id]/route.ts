import { ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { adminHandle, type IdCtx } from "@/lib/admin/route";
import { flashSalePatchSchema } from "@/lib/admin/schemas";
import { deleteFlashSale, updateFlashSale } from "@/lib/admin/service";

/** PATCH replaces `items` when provided. */
export const PATCH = adminHandle(async (req, ctx: IdCtx) => {
  const { id } = await ctx.params;
  return ok(await updateFlashSale(id, await parseBody(req, flashSalePatchSchema)));
});

export const DELETE = adminHandle(async (_req, ctx: IdCtx) => {
  const { id } = await ctx.params;
  await deleteFlashSale(id);
  return ok({ deleted: true });
});
