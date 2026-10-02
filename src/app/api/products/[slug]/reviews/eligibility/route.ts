import { handle, ok } from "@/lib/api/respond";
import { getUser } from "@/lib/auth/session";
import { reviewEligibility } from "@/lib/reviews/eligibility";
import { resolveProductId } from "@/lib/reviews/product-param";
import { findReviewableOrderItem } from "@/lib/reviews/service";
import type { ReviewEligibilityResponse } from "@/lib/reviews/types";

type Ctx = { params: Promise<{ slug: string }> };

/** GET /api/products/[id]/reviews/eligibility → { eligible, orderItemId, reason } */
export const GET = handle<Ctx>(async (_req, ctx) => {
  const { slug } = await ctx.params;
  const [productId, user] = await Promise.all([resolveProductId(slug), getUser()]);
  if (!user) {
    return ok<ReviewEligibilityResponse>({ eligible: false, orderItemId: null, reason: "not_logged_in" });
  }
  const item = await findReviewableOrderItem(user.id, productId);
  const result = reviewEligibility({
    loggedIn: true,
    deliveredAt: item?.deliveredAt ?? null,
    orderStatus: item?.status === "already_reviewed" ? "delivered" : (item?.status ?? null),
    alreadyReviewed: item?.status === "already_reviewed",
  });
  return ok<ReviewEligibilityResponse>({
    eligible: result.eligible,
    orderItemId: result.eligible ? (item?.orderItemId ?? null) : null,
    reason: result.reason,
  });
});
