import { ok } from "@/lib/api/respond";
import { adminHandle, type IdCtx } from "@/lib/admin/route";
import { simulateFulfilment } from "@/lib/admin/service";

/** POST /api/admin/orders/[id]/simulate — runs the remaining happy-path steps with courier notes. */
export const POST = adminHandle(async (_req, ctx: IdCtx) => {
  const { id } = await ctx.params;
  return ok(await simulateFulfilment(id));
});
