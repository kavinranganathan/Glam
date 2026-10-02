import { describe, expect, it } from "vitest";
import { eligibilityMessage, reviewAverage, reviewEligibility, reviewHistogram, reviewPoints } from "@/lib/reviews/eligibility";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-02T12:00:00Z");
const delivered = (daysAgo: number, extraMs = 0) => new Date(now.getTime() - daysAgo * DAY - extraMs).toISOString();

describe("reviewEligibility", () => {
  it("rejects guests before anything else", () => {
    expect(reviewEligibility({ loggedIn: false, deliveredAt: delivered(5), orderStatus: "delivered", alreadyReviewed: false, now })).toEqual({
      eligible: false,
      reason: "not_logged_in",
    });
  });

  it("requires a delivered order item", () => {
    expect(reviewEligibility({ loggedIn: true, deliveredAt: null, orderStatus: null, alreadyReviewed: false, now }).reason).toBe("not_purchased");
    expect(reviewEligibility({ loggedIn: true, deliveredAt: delivered(2), orderStatus: "shipped", alreadyReviewed: false, now }).reason).toBe(
      "not_purchased",
    );
  });

  it("treats return statuses as delivered", () => {
    for (const status of ["delivered", "return_initiated", "returned", "refunded"]) {
      expect(reviewEligibility({ loggedIn: true, deliveredAt: delivered(3), orderStatus: status, alreadyReviewed: false, now }).eligible).toBe(true);
    }
  });

  it("is too early within 24 hours of delivery", () => {
    expect(reviewEligibility({ loggedIn: true, deliveredAt: delivered(0, 23 * 60 * 60 * 1000), orderStatus: "delivered", alreadyReviewed: false, now })).toEqual(
      { eligible: false, reason: "too_early" },
    );
  });

  it("opens exactly at 24 hours", () => {
    expect(reviewEligibility({ loggedIn: true, deliveredAt: delivered(1), orderStatus: "delivered", alreadyReviewed: false, now }).eligible).toBe(true);
  });

  it("closes after 90 days", () => {
    expect(reviewEligibility({ loggedIn: true, deliveredAt: delivered(90), orderStatus: "delivered", alreadyReviewed: false, now }).eligible).toBe(true);
    expect(reviewEligibility({ loggedIn: true, deliveredAt: delivered(90, 1), orderStatus: "delivered", alreadyReviewed: false, now }).reason).toBe(
      "window_closed",
    );
  });

  it("blocks duplicate reviews ahead of timing checks", () => {
    expect(reviewEligibility({ loggedIn: true, deliveredAt: delivered(200), orderStatus: "delivered", alreadyReviewed: true, now }).reason).toBe(
      "already_reviewed",
    );
  });

  it("falls back to not_purchased for an unparsable timestamp", () => {
    expect(reviewEligibility({ loggedIn: true, deliveredAt: "garbage", orderStatus: "delivered", alreadyReviewed: false, now }).reason).toBe("not_purchased");
  });

  it("has copy for every reason", () => {
    for (const r of ["not_logged_in", "not_purchased", "too_early", "window_closed", "already_reviewed"] as const) {
      expect(eligibilityMessage(r).length).toBeGreaterThan(10);
    }
    expect(eligibilityMessage(null)).toBe("");
  });
});

describe("reviewHistogram / reviewAverage", () => {
  it("orders rows 5 → 1 with integer percentages", () => {
    const rows = reviewHistogram({ 5: 6, 4: 2, 3: 1, 2: 0, 1: 1 });
    expect(rows.map((r) => r.star)).toEqual([5, 4, 3, 2, 1]);
    expect(rows.map((r) => r.pct)).toEqual([60, 20, 10, 0, 10]);
    expect(reviewAverage({ 5: 6, 4: 2, 3: 1, 2: 0, 1: 1 })).toBe(4.2);
  });

  it("returns zeros when there are no reviews", () => {
    expect(reviewHistogram({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }).every((r) => r.pct === 0 && r.count === 0)).toBe(true);
    expect(reviewAverage({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })).toBe(0);
  });
});

describe("reviewPoints", () => {
  it("awards 50 with a photo and 20 without", () => {
    expect(reviewPoints(true)).toBe(50);
    expect(reviewPoints(false)).toBe(20);
  });
});
