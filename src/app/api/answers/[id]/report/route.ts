import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { requireUser } from "@/lib/auth/session";
import { reportAnswer } from "@/lib/reviews/qa";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/answers/[id]/report → { reported: true } */
export const POST = handle<Ctx>(async (_req, ctx) => {
  await requireUser();
  const { id } = await ctx.params;
  await reportAnswer(z.uuid().parse(id));
  return ok({ reported: true });
});
