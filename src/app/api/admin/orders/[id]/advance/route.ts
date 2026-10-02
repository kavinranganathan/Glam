import { ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { adminHandle, type IdCtx } from "@/lib/admin/route";
import { advanceSchema } from "@/lib/admin/schemas";
import { advanceOrder } from "@/lib/admin/service";
import type { OrderStatus } from "@/lib/orders/state-machine";

/** POST /api/admin/orders/[id]/advance { status, note? } — one allowed transition (cancel = status "cancelled" + reason note). */
export const POST = adminHandle(async (req, ctx: IdCtx) => {
  const { id } = await ctx.params;
  const body = await parseBody(req, advanceSchema);
  return ok(await advanceOrder(id, body.status as OrderStatus, body.note));
});
