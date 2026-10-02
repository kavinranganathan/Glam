import { ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { adminHandle, type IdCtx } from "@/lib/admin/route";
import { bannerPatchSchema } from "@/lib/admin/schemas";
import { deleteBanner, updateBanner } from "@/lib/admin/service";

export const PATCH = adminHandle(async (req, ctx: IdCtx) => {
  const { id } = await ctx.params;
  return ok(await updateBanner(id, await parseBody(req, bannerPatchSchema)));
});

export const DELETE = adminHandle(async (_req, ctx: IdCtx) => {
  const { id } = await ctx.params;
  await deleteBanner(id);
  return ok({ deleted: true });
});
