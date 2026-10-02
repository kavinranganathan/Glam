import { z } from "zod";
import { ApiError, handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { LIMITS, rateLimit } from "@/lib/api/rate-limit";
import { requireUser } from "@/lib/auth/session";
import { resolveProductId } from "@/lib/reviews/product-param";
import { askQuestion, listQuestions } from "@/lib/reviews/qa";

type Ctx = { params: Promise<{ slug: string }> };

/** GET /api/products/[id]/questions → { questions: QuestionView[] } */
export const GET = handle<Ctx>(async (_req, ctx) => {
  const { slug } = await ctx.params;
  const productId = await resolveProductId(slug);
  return ok({ questions: await listQuestions(productId) });
});

const bodySchema = z.object({ body: z.string().trim().min(10, "Ask a slightly longer question (10+ characters).").max(500) });

/** POST /api/products/[id]/questions → 201 QuestionView (login required). */
export const POST = handle<Ctx>(async (req, ctx) => {
  const user = await requireUser();
  if (!rateLimit(`qa:${user.id}`, LIMITS.perUserPerMinute, 60_000)) {
    throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please slow down.");
  }
  const { slug } = await ctx.params;
  const [productId, body] = await Promise.all([resolveProductId(slug), parseBody(req, bodySchema)]);
  return ok(await askQuestion(user.id, productId, body.body), { status: 201 });
});
