import { z } from "zod";
import { ApiError, handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { LIMITS, rateLimit } from "@/lib/api/rate-limit";
import { requireUser } from "@/lib/auth/session";
import { answerQuestion } from "@/lib/reviews/qa";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({ body: z.string().trim().min(5, "Write a slightly longer answer.").max(1000) });

/** POST /api/questions/[id]/answers → 201 AnswerView (login required). */
export const POST = handle<Ctx>(async (req, ctx) => {
  const user = await requireUser();
  if (!rateLimit(`qa:${user.id}`, LIMITS.perUserPerMinute, 60_000)) {
    throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please slow down.");
  }
  const { id } = await ctx.params;
  const questionId = z.uuid().parse(id);
  const body = await parseBody(req, bodySchema);
  return ok(await answerQuestion(user.id, questionId, body.body), { status: 201 });
});
