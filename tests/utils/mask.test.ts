import { describe, expect, it } from "vitest";
import { maskEmail, maskName } from "@/lib/utils/mask";

describe("maskName", () => {
  it("masks all but first and last letter of the first name", () => {
    expect(maskName("Priya Sharma")).toBe("P***a");
    expect(maskName("Rohan")).toBe("R***n");
  });
  it("handles short and empty names", () => {
    expect(maskName("Al")).toBe("A***");
    expect(maskName("")).toBe("GLAM Member");
    expect(maskName(null)).toBe("GLAM Member");
  });
});

describe("maskEmail", () => {
  it("masks the local part", () => {
    expect(maskEmail("priya.s@example.com")).toBe("p***s@example.com");
  });
  it("returns empty for invalid input", () => {
    expect(maskEmail("nope")).toBe("");
  });
});
