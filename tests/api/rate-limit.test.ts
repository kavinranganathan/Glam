import { beforeEach, describe, expect, it } from "vitest";
import { rateLimit, resetRateLimits } from "@/lib/api/rate-limit";
import { mapDbError } from "@/lib/api/respond";

describe("rateLimit", () => {
  beforeEach(() => resetRateLimits());

  it("allows up to the limit within the window and blocks after", () => {
    const t = 1_000_000;
    expect(rateLimit("u1", 3, 60_000, t)).toBe(true);
    expect(rateLimit("u1", 3, 60_000, t + 1)).toBe(true);
    expect(rateLimit("u1", 3, 60_000, t + 2)).toBe(true);
    expect(rateLimit("u1", 3, 60_000, t + 3)).toBe(false);
  });

  it("frees capacity once old hits leave the window", () => {
    const t = 1_000_000;
    rateLimit("u2", 1, 1000, t);
    expect(rateLimit("u2", 1, 1000, t + 500)).toBe(false);
    expect(rateLimit("u2", 1, 1000, t + 1001)).toBe(true);
  });

  it("keys are independent", () => {
    rateLimit("a", 1, 1000, 0);
    expect(rateLimit("b", 1, 1000, 0)).toBe(true);
  });
});

describe("mapDbError", () => {
  it("maps business exceptions raised by Postgres functions", () => {
    expect(mapDbError("OUT_OF_STOCK:GLM1004")).toEqual({
      code: "OUT_OF_STOCK",
      message: "Sorry, GLM1004 just went out of stock. Please update your bag.",
      status: 409,
    });
    expect(mapDbError("COD_LIMIT")?.status).toBe(400);
    expect(mapDbError("TRANSITION_NOT_ALLOWED:placed -> shipped")?.code).toBe("TRANSITION_NOT_ALLOWED");
  });
  it("returns null for unknown errors", () => {
    expect(mapDbError("connection refused")).toBeNull();
  });
});
