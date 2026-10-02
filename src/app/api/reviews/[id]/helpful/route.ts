import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { requireUser } from "@/lib/auth/session";
import { toggleHelpful } from "@/lib/reviews/service";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/reviews/[id]/helpful → { helpful: boolean, count } (toggles the caller's vote). */
export const POST = handle<Ctx>(async (_req, ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const reviewId = z.uuid().parse(id);
  return ok(await toggleHelpful(user.id, reviewId));
});
