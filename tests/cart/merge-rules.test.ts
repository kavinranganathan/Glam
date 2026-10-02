import { describe, expect, it } from "vitest";
import { buildCategoryPath, effectiveQty, maxQtyFor, mergeQuantities, normaliseCouponCode, type CategoryNode } from "@/lib/cart/rules";
import { isBackInStock, isPriceDrop, pickDefaultVariant, wishlistInStock } from "@/lib/wishlist/rules";

describe("mergeQuantities", () => {
  it("sums guest and user quantities", () => {
    expect(mergeQuantities(2, 3)).toBe(5);
  });
  it("caps the merged quantity at 10", () => {
    expect(mergeQuantities(7, 6)).toBe(10);
  });
  it("respects a custom cap and ignores negatives", () => {
    expect(mergeQuantities(4, 4, 5)).toBe(5);
    expect(mergeQuantities(-3, 2)).toBe(2);
  });
});

describe("effectiveQty / maxQtyFor", () => {
  it("caps the requested quantity at stock and at 10", () => {
    expect(effectiveQty(4, 2)).toBe(2);
    expect(effectiveQty(15, 100)).toBe(10);
    expect(effectiveQty(3, 100)).toBe(3);
  });
  it("is 0 when the variant is out of stock", () => {
    expect(effectiveQty(2, 0)).toBe(0);
    expect(maxQtyFor(0)).toBe(0);
    expect(maxQtyFor(7)).toBe(7);
    expect(maxQtyFor(70)).toBe(10);
  });
});

describe("buildCategoryPath", () => {
  const cats = new Map<string, CategoryNode>([
    ["beauty", { id: "beauty", parent_id: null }],
    ["skincare", { id: "skincare", parent_id: "beauty" }],
    ["serums", { id: "serums", parent_id: "skincare" }],
    ["loop-a", { id: "loop-a", parent_id: "loop-b" }],
    ["loop-b", { id: "loop-b", parent_id: "loop-a" }],
  ]);
  it("walks from the leaf up to the root", () => {
    expect(buildCategoryPath("serums", cats)).toEqual(["serums", "skincare", "beauty"]);
  });
  it("returns just the id for an unknown category", () => {
    expect(buildCategoryPath("unknown", cats)).toEqual(["unknown"]);
  });
  it("stops on cycles", () => {
    expect(buildCategoryPath("loop-a", cats)).toEqual(["loop-a", "loop-b"]);
  });
});

describe("normaliseCouponCode", () => {
  it("trims and upper-cases", () => {
    expect(normaliseCouponCode("  glam200 ")).toBe("GLAM200");
  });
});

describe("isPriceDrop", () => {
  it("is true only for a drop of at least 10%", () => {
    expect(isPriceDrop(89_900, 100_000)).toBe(true);
    expect(isPriceDrop(90_000, 100_000)).toBe(false); // exactly 10% is not strictly below
    expect(isPriceDrop(95_000, 100_000)).toBe(false);
  });
  it("never flags when the price went up or the add price is missing", () => {
    expect(isPriceDrop(120_000, 100_000)).toBe(false);
    expect(isPriceDrop(50_000, 0)).toBe(false);
  });
});

describe("wishlist stock helpers", () => {
  const variants = [
    { id: "v1", stock: 0, is_default: false },
    { id: "v2", stock: 5, is_default: true },
  ];
  it("uses the chosen variant's stock when set, else any variant", () => {
    expect(wishlistInStock(variants, "v1")).toBe(false);
    expect(wishlistInStock(variants, "v2")).toBe(true);
    expect(wishlistInStock(variants, null)).toBe(true);
    expect(wishlistInStock(variants, "missing")).toBe(true);
  });
  it("picks the flagged default variant, else the first", () => {
    expect(pickDefaultVariant(variants)?.id).toBe("v2");
    expect(pickDefaultVariant([{ id: "x", stock: 1, is_default: false }])?.id).toBe("x");
    expect(pickDefaultVariant([])).toBeNull();
  });
  it("back in stock requires stock now and an alert from the owner", () => {
    expect(isBackInStock(true, true)).toBe(true);
    expect(isBackInStock(true, false)).toBe(false);
    expect(isBackInStock(false, true)).toBe(false);
  });
});
