import { ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { adminHandle, type IdCtx } from "@/lib/admin/route";
import { ticketPatchSchema } from "@/lib/admin/schemas";
import { updateTicket } from "@/lib/admin/service";

/** PATCH /api/admin/tickets/[id] { status } */
export const PATCH = adminHandle(async (req, ctx: IdCtx) => {
  const { id } = await ctx.params;
  const { status } = await parseBody(req, ticketPatchSchema);
  return ok(await updateTicket(id, status));
});
