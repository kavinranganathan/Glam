import { describe, expect, it } from "vitest";
import { ALL_STATUSES, availableActions, canCancel, canTransition, happyPathIndex, isTerminal, STATUS_LABEL } from "@/lib/orders/state-machine";

describe("order state machine", () => {
  it("allows the happy path and blocks skipping steps", () => {
    expect(canTransition("placed", "processing")).toBe(true);
    expect(canTransition("processing", "shipped")).toBe(true);
    expect(canTransition("shipped", "out_for_delivery")).toBe(true);
    expect(canTransition("out_for_delivery", "delivered")).toBe(true);
    expect(canTransition("placed", "shipped")).toBe(false);
    expect(canTransition("delivered", "shipped")).toBe(false);
  });
  it("handles failed delivery, returns and refunds", () => {
    expect(canTransition("out_for_delivery", "failed_delivery")).toBe(true);
    expect(canTransition("failed_delivery", "out_for_delivery")).toBe(true);
    expect(canTransition("delivered", "return_initiated")).toBe(true);
    expect(canTransition("return_initiated", "returned")).toBe(true);
    expect(canTransition("returned", "refunded")).toBe(true);
    expect(isTerminal("refunded")).toBe(true);
    expect(isTerminal("cancelled")).toBe(true);
    expect(isTerminal("delivered")).toBe(false);
  });
  it("has a consumer label for every status", () => {
    for (const s of ALL_STATUSES) expect(STATUS_LABEL[s]).toBeTruthy();
  });
});

describe("canCancel", () => {
  const placed = new Date("2026-10-02T10:00:00Z");
  it("allows cancel within 30 minutes of placing", () => {
    expect(canCancel("placed", placed, new Date("2026-10-02T10:29:00Z"))).toBe(true);
    expect(canCancel("placed", placed, new Date("2026-10-02T10:31:00Z"))).toBe(false);
  });
  it("allows cancel while processing, not once shipped", () => {
    expect(canCancel("processing", placed, new Date("2026-10-03T10:00:00Z"))).toBe(true);
    expect(canCancel("shipped", placed, new Date("2026-10-02T10:05:00Z"))).toBe(false);
  });
});

describe("availableActions", () => {
  const placed = new Date("2026-10-02T10:00:00Z");
  it("offers return/review/reorder after delivery", () => {
    expect(availableActions("delivered", placed)).toEqual(["return", "review", "reorder", "invoice"]);
  });
  it("offers cancel right after placing", () => {
    expect(availableActions("placed", placed, new Date("2026-10-02T10:10:00Z"))).toEqual(["cancel", "invoice"]);
  });
  it("offers reschedule on failed delivery and refund status on cancel", () => {
    expect(availableActions("failed_delivery", placed)).toContain("reschedule");
    expect(availableActions("cancelled", placed)).toContain("view_refund");
  });
  it("maps statuses to the happy path index for the timeline", () => {
    expect(happyPathIndex("placed")).toBe(0);
    expect(happyPathIndex("delivered")).toBe(4);
    expect(happyPathIndex("refunded")).toBe(4);
    expect(happyPathIndex("cancelled")).toBe(-1);
  });
});
