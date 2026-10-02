import { describe, expect, it } from "vitest";
import { formatOrderNumber, isOrderNumber, orderNumberDate, shortOrderNumber } from "@/lib/orders/numbers";

describe("isOrderNumber", () => {
  it("accepts the GLM-YYYYMMDD-NNNN format", () => {
    expect(isOrderNumber("GLM-20261002-0001")).toBe(true);
    expect(isOrderNumber(" GLM-20261002-9999 ")).toBe(true);
  });
  it("rejects other shapes", () => {
    expect(isOrderNumber("GLM-2026102-0001")).toBe(false);
    expect(isOrderNumber("glm-20261002-0001")).toBe(false);
    expect(isOrderNumber("ORD-20261002-0001")).toBe(false);
    expect(isOrderNumber("GLM-20261002-001")).toBe(false);
    expect(isOrderNumber("")).toBe(false);
  });
});

describe("formatOrderNumber", () => {
  it("normalises loose user input", () => {
    expect(formatOrderNumber("glm 20261002 0001")).toBe("GLM-20261002-0001");
    expect(formatOrderNumber("GLM202610020001")).toBe("GLM-20261002-0001");
    expect(formatOrderNumber("#glm-20261002-0001")).toBe("GLM-20261002-0001");
  });
  it("returns null for junk or impossible dates", () => {
    expect(formatOrderNumber("hello")).toBeNull();
    expect(formatOrderNumber("GLM-20261302-0001")).toBeNull();
    expect(formatOrderNumber("GLM-20260231-0001")).toBeNull();
  });
});

describe("orderNumberDate / shortOrderNumber", () => {
  it("decodes the embedded date", () => {
    expect(orderNumberDate("GLM-20261002-0042")?.toISOString()).toBe("2026-10-02T00:00:00.000Z");
    expect(orderNumberDate("nope")).toBeNull();
  });
  it("renders a compact label", () => {
    expect(shortOrderNumber("GLM-20261002-0042")).toBe("#0042 · 2 Oct");
    expect(shortOrderNumber("weird")).toBe("weird");
  });
});
