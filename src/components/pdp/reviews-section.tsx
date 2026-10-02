import { listReviews } from "@/lib/reviews/service";
import type { ReviewListResult } from "@/lib/reviews/types";
import type { ProductDetail } from "@/lib/catalogue/types";
import { ReviewsList } from "./reviews-list";

/** Server wrapper: fetches the first page of reviews and hands off to the client list (PRD §8.5.8). */
export async function ReviewsSection({
  product,
  viewerId,
  openReviewFor,
}: {
  product: ProductDetail;
  viewerId: string | null;
  /** `?review=<orderItemId>` deep link from the review-prompt notification. */
  openReviewFor: string | null;
}) {
  let initial: ReviewListResult | null = null;
  try {
    initial = await listReviews(product.id, { page: 1, pageSize: 10 }, viewerId);
  } catch (e) {
    console.error("[pdp] reviews failed", e);
  }
  return (
    <ReviewsList
      productId={product.id}
      productName={product.name}
      initial={initial}
      isLoggedIn={Boolean(viewerId)}
      openReviewFor={openReviewFor}
      ratingAvg={product.ratingAvg}
      ratingCount={product.ratingCount}
    />
  );
}
