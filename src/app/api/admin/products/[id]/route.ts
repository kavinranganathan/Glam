import { ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { adminHandle, type IdCtx } from "@/lib/admin/route";
import { productPricingSchema } from "@/lib/admin/schemas";
import { updateProductPricing } from "@/lib/admin/service";

/** PATCH /api/admin/products/[id] { price?, mrp?, pro_price?, is_active? } — fires price-drop alerts when price falls. */
export const PATCH = adminHandle(async (req, ctx: IdCtx) => {
  const { id } = await ctx.params;
  return ok(await updateProductPricing(id, await parseBody(req, productPricingSchema)));
});
