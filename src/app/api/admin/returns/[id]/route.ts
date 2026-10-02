import { ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { adminHandle, type IdCtx } from "@/lib/admin/route";
import { returnAdvanceSchema } from "@/lib/admin/schemas";
import { advanceReturn, getAdminReturn } from "@/lib/admin/service";

export const GET = adminHandle(async (_req, ctx: IdCtx) => {
  const { id } = await ctx.params;
  return ok(await getAdminReturn(id));
});

/** POST /api/admin/returns/[id] { status, note? } → rpc advance_return. */
export const POST = adminHandle(async (req, ctx: IdCtx) => {
  const { id } = await ctx.params;
  const body = await parseBody(req, returnAdvanceSchema);
  return ok(await advanceReturn(id, body.status, body.note));
});
