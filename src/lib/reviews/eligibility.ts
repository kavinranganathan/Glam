/**
 * Pure review-eligibility rules (PRD §8.5.8, spec §6 "Reviews"). Mirrors the checks in the
 * `submit_review` SQL function so the UI can explain *why* before the user tries to post.
 */

export type ReviewIneligibleReason = "not_logged_in" | "not_purchased" | "too_early" | "window_closed" | "already_reviewed";

export interface ReviewEligibilityInput {
  loggedIn: boolean;
  /** ISO timestamp of delivery, or null when the order has not been delivered. */
  deliveredAt: string | null;
  orderStatus: string | null;
  alreadyReviewed: boolean;
  now?: Date;
}

export interface ReviewEligibility {
  eligible: boolean;
  reason: ReviewIneligibleReason | null;
}

export const REVIEW_OPENS_AFTER_MS = 24 * 60 * 60 * 1000;
export const REVIEW_WINDOW_DAYS = 90;
export const REVIEW_MIN_BODY = 30;
export const REVIEW_MAX_PHOTOS = 5;

/** Order statuses that count as "delivered" for review purposes. */
export const DELIVERED_STATUSES: ReadonlySet<string> = new Set(["delivered", "return_initiated", "returned", "refunded"]);

export function reviewEligibility(input: ReviewEligibilityInput): ReviewEligibility {
  if (!input.loggedIn) return { eligible: false, reason: "not_logged_in" };
  if (!input.deliveredAt || !input.orderStatus || !DELIVERED_STATUSES.has(input.orderStatus)) {
    return { eligible: false, reason: "not_purchased" };
  }
  if (input.alreadyReviewed) return { eligible: false, reason: "already_reviewed" };
  const delivered = new Date(input.deliveredAt).getTime();
  if (Number.isNaN(delivered)) return { eligible: false, reason: "not_purchased" };
  const now = (input.now ?? new Date()).getTime();
  if (now < delivered + REVIEW_OPENS_AFTER_MS) return { eligible: false, reason: "too_early" };
  if (now > delivered + REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000) return { eligible: false, reason: "window_closed" };
  return { eligible: true, reason: null };
}

export type StarCounts = Record<1 | 2 | 3 | 4 | 5, number>;

export interface HistogramRow {
  star: 1 | 2 | 3 | 4 | 5;
  count: number;
  /** Integer percentage of all reviews; rows sum to ≤100. */
  pct: number;
}

/** Histogram rows ordered 5 → 1 with integer percentages (0 when there are no reviews). */
export function reviewHistogram(counts: StarCounts): HistogramRow[] {
  const total = [1, 2, 3, 4, 5].reduce((s, k) => s + (counts[k as 1 | 2 | 3 | 4 | 5] ?? 0), 0);
  return ([5, 4, 3, 2, 1] as const).map((star) => {
    const count = counts[star] ?? 0;
    return { star, count, pct: total ? Math.round((count / total) * 100) : 0 };
  });
}

/** Weighted average from star counts, rounded to one decimal. */
export function reviewAverage(counts: StarCounts): number {
  let total = 0;
  let sum = 0;
  for (const star of [1, 2, 3, 4, 5] as const) {
    total += counts[star] ?? 0;
    sum += star * (counts[star] ?? 0);
  }
  return total ? Math.round((sum / total) * 10) / 10 : 0;
}

/** Points awarded by `submit_review`: 50 with at least one photo, otherwise 20. */
export function reviewPoints(hasPhoto: boolean): number {
  return hasPhoto ? 50 : 20;
}

/** Human-readable copy for each ineligibility reason. */
export function eligibilityMessage(reason: ReviewIneligibleReason | null): string {
  switch (reason) {
    case "not_logged_in":
      return "Sign in to write a review.";
    case "not_purchased":
      return "Only verified buyers can review this product. Reviews open once your order is delivered.";
    case "too_early":
      return "Reviews open 24 hours after delivery. Give it a try first!";
    case "window_closed":
      return "The 90-day review window for your order has closed.";
    case "already_reviewed":
      return "You've already reviewed this product. Thank you!";
    default:
      return "";
  }
}
