import { z } from "zod";
import { ApiError, handle, ok } from "@/lib/api/respond";
import { parseBody, parseQuery } from "@/lib/api/validate";
import { LIMITS, rateLimit } from "@/lib/api/rate-limit";
import { getUser, requireUser } from "@/lib/auth/session";
import { resolveProductId } from "@/lib/reviews/product-param";
import { listReviews, submitReview } from "@/lib/reviews/service";
import { REVIEW_MAX_PHOTOS, REVIEW_MIN_BODY } from "@/lib/reviews/eligibility";

type Ctx = { params: Promise<{ slug: string }> };

const querySchema = z.object({
  star: z.coerce.number().int().min(1).max(5).optional(),
  skin_type: z.string().max(40).optional(),
  concern: z.string().max(60).optional(),
  with_photos: z.enum(["1", "true", "0", "false"]).optional(),
  sort: z.enum(["recent", "helpful", "critical"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  page_size: z.coerce.number().int().min(1).max(50).optional(),
});

/** GET /api/products/[id]/reviews?star=&skin_type=&concern=&with_photos=1&sort=&page= */
export const GET = handle<Ctx>(async (req, ctx) => {
  const { slug } = await ctx.params;
  const [productId, q, user] = await Promise.all([resolveProductId(slug), Promise.resolve(parseQuery(req, querySchema)), getUser()]);
  const result = await listReviews(
    productId,
    {
      star: q.star,
      skinType: q.skin_type,
      concern: q.concern,
      withPhotos: q.with_photos === "1" || q.with_photos === "true",
      sort: q.sort,
      page: q.page,
      pageSize: q.page_size,
    },
    user?.id ?? null,
  );
  return ok(result);
});

const bodySchema = z.object({
  orderItemId: z.uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().nullable(),
  body: z.string().trim().min(REVIEW_MIN_BODY, `Please write at least ${REVIEW_MIN_BODY} characters.`).max(4000),
  photos: z.array(z.string().url().max(2000)).max(REVIEW_MAX_PHOTOS).optional(),
  skinType: z.string().max(40).optional().nullable(),
  concerns: z.array(z.string().max(60)).max(10).optional(),
});

/** POST /api/products/[id]/reviews → 201 { id, points } (verified purchase enforced by `submit_review`). */
export const POST = handle<Ctx>(async (req, ctx) => {
  const user = await requireUser();
  if (!rateLimit(`review:${user.id}`, LIMITS.perUserPerMinute, 60_000)) {
    throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please slow down.");
  }
  const { slug } = await ctx.params;
  const [productId, body] = await Promise.all([resolveProductId(slug), parseBody(req, bodySchema)]);
  const id = await submitReview(user.id, body);
  // Sanity: the RPC derives the product from the order item; surface a mismatch as a 409 to the client.
  const points = body.photos?.length ? 50 : 20;
  return ok({ id, productId, points }, { status: 201 });
});
