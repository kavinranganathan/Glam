import { ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { adminHandle, type IdCtx } from "@/lib/admin/route";
import { qaDeleteSchema } from "@/lib/admin/schemas";
import { deleteQa } from "@/lib/admin/service";

/** DELETE /api/admin/qa/[id] { kind: "question" | "answer" } — removes reported Q&A content. */
export const DELETE = adminHandle(async (req, ctx: IdCtx) => {
  const { id } = await ctx.params;
  const { kind } = await parseBody(req, qaDeleteSchema);
  await deleteQa(kind, id);
  return ok({ deleted: true });
});
