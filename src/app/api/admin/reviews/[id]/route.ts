import { ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { adminHandle, type IdCtx } from "@/lib/admin/route";
import { reviewPatchSchema } from "@/lib/admin/schemas";
import { respondToReview, setReviewStatus } from "@/lib/admin/service";

/** PATCH /api/admin/reviews/[id] { status?, brandResponse? } */
export const PATCH = adminHandle(async (req, ctx: IdCtx) => {
  const { id } = await ctx.params;
  const body = await parseBody(req, reviewPatchSchema);
  if (body.status) await setReviewStatus(id, body.status);
  if (body.brandResponse !== undefined) await respondToReview(id, body.brandResponse);
  return ok({ updated: true });
});
