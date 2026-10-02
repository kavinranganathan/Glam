import { describe, expect, it } from "vitest";
import { discountPercent, formatINR, roundToRupee, toPaise } from "@/lib/utils/money";

describe("formatINR", () => {
  it("formats whole rupees without decimals using Indian grouping", () => {
    expect(formatINR(129900)).toBe("₹1,299");
    expect(formatINR(10000000)).toBe("₹1,00,000");
    expect(formatINR(0)).toBe("₹0");
  });
  it("keeps paise when present", () => {
    expect(formatINR(129950)).toBe("₹1,299.50");
  });
  it("handles negatives", () => {
    expect(formatINR(-5000)).toBe("-₹50");
  });
});

describe("toPaise / roundToRupee", () => {
  it("converts rupees to paise", () => {
    expect(toPaise(299)).toBe(29900);
    expect(toPaise(12.345)).toBe(1235);
  });
  it("rounds to nearest rupee", () => {
    expect(roundToRupee(12349)).toBe(12300);
    expect(roundToRupee(12350)).toBe(12400);
  });
});

describe("discountPercent", () => {
  it("computes rounded percent off", () => {
    expect(discountPercent(100000, 58000)).toBe(42);
  });
  it("is zero when there is no discount or bad MRP", () => {
    expect(discountPercent(100000, 100000)).toBe(0);
    expect(discountPercent(0, 100)).toBe(0);
    expect(discountPercent(100, 200)).toBe(0);
  });
});
