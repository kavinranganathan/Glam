import { describe, expect, it } from "vitest";
import { isReturnable, photoRequired, refundEta, returnWindowDays } from "@/lib/returns/policy";

describe("return policy", () => {
  it("uses category-specific windows", () => {
    expect(returnWindowDays("beauty")).toBe(30);
    expect(returnWindowDays("fashion")).toBe(14);
    expect(returnWindowDays("wellness")).toBe(7);
  });
  it("requires photos for damaged, wrong and defective items", () => {
    expect(photoRequired("Damaged")).toBe(true);
    expect(photoRequired("Wrong item")).toBe(true);
    expect(photoRequired("Defective")).toBe(true);
    expect(photoRequired("Changed mind")).toBe(false);
  });
  it("checks the window and non-returnable flag", () => {
    const delivered = new Date("2026-10-01T00:00:00Z");
    expect(isReturnable(delivered, new Date("2026-10-20T00:00:00Z"), 30, false)).toBe(true);
    expect(isReturnable(delivered, new Date("2026-11-05T00:00:00Z"), 30, false)).toBe(false);
    expect(isReturnable(delivered, new Date("2026-10-05T00:00:00Z"), 30, true)).toBe(false);
    expect(isReturnable(null, new Date(), 30, false)).toBe(false);
  });
  it("describes refund timing", () => {
    expect(refundEta("wallet", "upi")).toMatch(/Instant/);
    expect(refundEta("original", "cod")).toMatch(/NEFT/);
    expect(refundEta("original", "card")).toMatch(/5–7/);
  });
});
