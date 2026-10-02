import { ApiError, handle, ok } from "@/lib/api/respond";
import { getProductBySlug } from "@/lib/catalogue/queries";

/** Variants for the quick-add picker (PRD §8.4.2 "opens bottom sheet picker"). */
export const GET = handle(async (_req, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  const product = await getProductBySlug(slug);
  if (!product) throw new ApiError(404, "NOT_FOUND", "Product not found.");
  return ok({ variants: product.variants, offerLabel: product.offerLabel, name: product.name });
});
