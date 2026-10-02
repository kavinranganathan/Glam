import { describe, expect, it } from "vitest";
import { nextTier, pointsMultiplier, tierForSpend, tierProgress } from "@/lib/loyalty/tiers";
import { pointsForOrder, redeemablePoints } from "@/lib/loyalty/points";

describe("tiers", () => {
  it("maps rolling 12-month spend to tiers", () => {
    expect(tierForSpend(0)).toBe("base");
    expect(tierForSpend(999_900)).toBe("base");
    expect(tierForSpend(1_000_000)).toBe("silver");
    expect(tierForSpend(3_000_000)).toBe("gold");
    expect(tierForSpend(7_500_000)).toBe("platinum");
  });
  it("has the PRD multipliers", () => {
    expect(pointsMultiplier("base")).toBe(1);
    expect(pointsMultiplier("silver")).toBe(1.5);
    expect(pointsMultiplier("gold")).toBe(2);
    expect(pointsMultiplier("platinum")).toBe(3);
  });
  it("reports the next tier and progress", () => {
    expect(nextTier(500_000)).toEqual({ tier: "silver", remaining: 500_000 });
    expect(tierProgress(500_000)).toBeCloseTo(0.5);
    expect(nextTier(8_000_000)).toBeNull();
    expect(tierProgress(8_000_000)).toBe(1);
  });
});

describe("points", () => {
  it("earns 1 point per ₹10 times multiplier, floored", () => {
    expect(pointsForOrder(99_900, "base")).toBe(99);
    expect(pointsForOrder(99_900, "silver")).toBe(149);
    expect(pointsForOrder(0, "gold")).toBe(0);
  });
  it("limits redeemable points by balance and amount", () => {
    expect(redeemablePoints(500, 100_000)).toBe(500);
    expect(redeemablePoints(5000, 100_000)).toBe(4000);
    expect(redeemablePoints(0, 100_000)).toBe(0);
  });
});
