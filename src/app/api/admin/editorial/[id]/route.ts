import { ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { adminHandle, type IdCtx } from "@/lib/admin/route";
import { editorialPatchSchema } from "@/lib/admin/schemas";
import { deleteEditorial, updateEditorial } from "@/lib/admin/service";

export const PATCH = adminHandle(async (req, ctx: IdCtx) => {
  const { id } = await ctx.params;
  return ok(await updateEditorial(id, await parseBody(req, editorialPatchSchema)));
});

export const DELETE = adminHandle(async (_req, ctx: IdCtx) => {
  const { id } = await ctx.params;
  await deleteEditorial(id);
  return ok({ deleted: true });
});
