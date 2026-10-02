import { describe, expect, it } from "vitest";
import { budgetBandFor, normaliseTag, scoreForProfile } from "@/lib/recommendations/scoring";

const NOW = new Date("2026-10-02T12:00:00Z");
const base = {
  skinTypes: ["Oily", "Combination"],
  concerns: ["Acne", "Dark Spots"],
  price: 89900,
  soldCount: 0,
  launchedAt: "2025-01-01T00:00:00Z",
};

describe("scoreForProfile", () => {
  it("scores only popularity and recency with no profile", () => {
    expect(scoreForProfile(base, null, NOW)).toBe(0);
    expect(scoreForProfile({ ...base, soldCount: 999 }, null, NOW)).toBeCloseTo(1.5, 5);
  });

  it("adds +3 for a skin type match, case-insensitively", () => {
    const bp = { skinType: "oily", concerns: [], budget: null };
    expect(scoreForProfile(base, bp, NOW)).toBe(3);
    expect(scoreForProfile({ ...base, skinTypes: ["Dry"] }, bp, NOW)).toBe(0);
  });

  it("adds +2 per matching concern, normalising separators", () => {
    const bp = { skinType: null, concerns: ["acne", "dark_spots", "hydration"], budget: null };
    expect(scoreForProfile(base, bp, NOW)).toBe(4);
  });

  it("adds +1 when the price falls inside the budget band", () => {
    expect(scoreForProfile({ ...base, price: 49999 }, { skinType: null, concerns: [], budget: "under_500" }, NOW)).toBe(1);
    expect(scoreForProfile({ ...base, price: 50000 }, { skinType: null, concerns: [], budget: "under_500" }, NOW)).toBe(0);
    expect(scoreForProfile({ ...base, price: 50000 }, { skinType: null, concerns: [], budget: "500_1500" }, NOW)).toBe(1);
    expect(scoreForProfile({ ...base, price: 399999 }, { skinType: null, concerns: [], budget: "1500_4000" }, NOW)).toBe(1);
    expect(scoreForProfile({ ...base, price: 400000 }, { skinType: null, concerns: [], budget: "4000_plus" }, NOW)).toBe(1);
  });

  it("adds +0.5 for launches within 14 days but not older or future ones", () => {
    const recent = new Date(NOW.getTime() - 13 * 86400000).toISOString();
    const old = new Date(NOW.getTime() - 15 * 86400000).toISOString();
    const future = new Date(NOW.getTime() + 86400000).toISOString();
    expect(scoreForProfile({ ...base, launchedAt: recent }, null, NOW)).toBe(0.5);
    expect(scoreForProfile({ ...base, launchedAt: old }, null, NOW)).toBe(0);
    expect(scoreForProfile({ ...base, launchedAt: future }, null, NOW)).toBe(0);
  });

  it("sums every component", () => {
    const bp = { skinType: "Combination", concerns: ["Acne"], budget: "500_1500" };
    const recent = new Date(NOW.getTime() - 86400000).toISOString();
    const score = scoreForProfile({ ...base, soldCount: 9, launchedAt: recent }, bp, NOW);
    expect(score).toBeCloseTo(3 + 2 + 1 + 0.5 + 0.5, 5);
  });

  it("ranks a matching product above a merely popular one", () => {
    const bp = { skinType: "Oily", concerns: ["Acne", "Dark Spots"], budget: "500_1500" };
    const matching = scoreForProfile({ ...base, soldCount: 10 }, bp, NOW);
    const popular = scoreForProfile({ ...base, skinTypes: ["Dry"], concerns: [], price: 999900, soldCount: 100000 }, bp, NOW);
    expect(matching).toBeGreaterThan(popular);
  });
});

describe("helpers", () => {
  it("normaliseTag collapses case and separators", () => {
    expect(normaliseTag(" Dark-Spots ")).toBe("dark spots");
    expect(normaliseTag("dark_spots")).toBe("dark spots");
  });
  it("budgetBandFor maps paise to bands", () => {
    expect(budgetBandFor(0)).toBe("under_500");
    expect(budgetBandFor(150000)).toBe("1500_4000");
    expect(budgetBandFor(10000000)).toBe("4000_plus");
  });
});
