import { ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { adminHandle, type IdCtx } from "@/lib/admin/route";
import { variantStockSchema } from "@/lib/admin/schemas";
import { updateVariantStock } from "@/lib/admin/service";

/** PATCH /api/admin/variants/[id] { stock } — fires back-in-stock alerts on 0 → >0. */
export const PATCH = adminHandle(async (req, ctx: IdCtx) => {
  const { id } = await ctx.params;
  const { stock } = await parseBody(req, variantStockSchema);
  return ok(await updateVariantStock(id, stock));
});
