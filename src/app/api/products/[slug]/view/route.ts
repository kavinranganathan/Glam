import { ApiError, handle, ok } from "@/lib/api/respond";
import { getGuestSessionId } from "@/lib/auth/guest";
import { getUser } from "@/lib/auth/session";
import { getProductIdBySlug } from "@/lib/catalogue/queries";
import { recordView } from "@/lib/catalogue/recently-viewed";

/** POST /api/products/[slug]/view records a recently-viewed entry for the user or guest session. */
export const POST = handle(async (_req, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  const productId = await getProductIdBySlug(slug);
  if (!productId) throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  const [user, sessionId] = await Promise.all([getUser(), getGuestSessionId()]);
  await recordView(productId, user, sessionId);
  return ok({ ok: true });
});
