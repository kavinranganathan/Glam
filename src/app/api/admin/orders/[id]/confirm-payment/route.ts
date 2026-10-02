import { ok } from "@/lib/api/respond";
import { adminHandle, type IdCtx } from "@/lib/admin/route";
import { confirmOrderPayment } from "@/lib/admin/service";

/** POST /api/admin/orders/[id]/confirm-payment — marks a pending payment as received (rpc confirm_payment). */
export const POST = adminHandle(async (_req, ctx: IdCtx) => {
  const { id } = await ctx.params;
  return ok(await confirmOrderPayment(id));
});
