import { describe, expect, it } from "vitest";
import {
  canAdvanceReturn,
  countsTowardGmv,
  defaultSalePrice,
  kpiWindow,
  nextReturnStatusesFor,
  nextStatusesFor,
  normaliseCouponCode,
  paiseToRupees,
  rupeesToPaise,
  simulationPlan,
  summariseOrders,
} from "@/lib/admin/rules";

describe("nextStatusesFor", () => {
  it("mirrors the order state machine", () => {
    expect(nextStatusesFor("placed")).toEqual(["processing", "cancelled"]);
    expect(nextStatusesFor("out_for_delivery")).toEqual(["delivered", "failed_delivery"]);
    expect(nextStatusesFor("refunded")).toEqual([]);
  });
});

describe("simulationPlan", () => {
  it("returns the full happy path from placed", () => {
    expect(simulationPlan("placed").map((s) => s.status)).toEqual(["processing", "shipped", "out_for_delivery", "delivered"]);
    expect(simulationPlan("placed")[0].note).toBe("Packed at Bhiwandi FC");
    expect(simulationPlan("placed")[3].note).toBe("Delivered — OTP verified");
  });
  it("skips steps already done", () => {
    expect(simulationPlan("shipped").map((s) => s.status)).toEqual(["out_for_delivery", "delivered"]);
    expect(simulationPlan("out_for_delivery").map((s) => s.status)).toEqual(["delivered"]);
  });
  it("is empty once delivered or off the happy path, and recovers from failed delivery", () => {
    expect(simulationPlan("delivered")).toEqual([]);
    expect(simulationPlan("cancelled")).toEqual([]);
    expect(simulationPlan("refunded")).toEqual([]);
    expect(simulationPlan("failed_delivery").map((s) => s.status)).toEqual(["out_for_delivery", "delivered"]);
  });
});

describe("return transitions", () => {
  it("follows requested → pickup_scheduled → picked_up → received → refunded, or rejected", () => {
    expect(nextReturnStatusesFor("requested")).toEqual(["pickup_scheduled", "rejected"]);
    expect(nextReturnStatusesFor("received")).toEqual(["refunded"]);
    expect(nextReturnStatusesFor("refunded")).toEqual([]);
    expect(canAdvanceReturn("picked_up", "received")).toBe(true);
    expect(canAdvanceReturn("requested", "refunded")).toBe(false);
    expect(canAdvanceReturn("rejected", "requested")).toBe(false);
  });
});

describe("money helpers", () => {
  it("converts rupees to paise with rounding and tolerates formatted input", () => {
    expect(rupeesToPaise(1299)).toBe(129900);
    expect(rupeesToPaise("₹1,299.50")).toBe(129950);
    expect(rupeesToPaise(0.005)).toBe(1);
    expect(rupeesToPaise("abc")).toBe(0);
    expect(rupeesToPaise(-5)).toBe(0);
    expect(paiseToRupees(129950)).toBe(1299.5);
    expect(paiseToRupees(null)).toBe(0);
  });
  it("prefills a 30% off sale price rounded down to the rupee", () => {
    expect(defaultSalePrice(100000)).toBe(70000);
    expect(defaultSalePrice(99900)).toBe(69900);
    expect(defaultSalePrice(50)).toBe(100);
    expect(defaultSalePrice(100000, 50)).toBe(50000);
  });
  it("normalises coupon codes", () => {
    expect(normaliseCouponCode("  glam 200 ")).toBe("GLAM200");
  });
});

describe("kpiWindow", () => {
  it("starts today at IST midnight and the week 6 days earlier", () => {
    const now = new Date("2026-10-02T10:00:00Z"); // 15:30 IST
    const { todayStart, weekStart } = kpiWindow(now);
    expect(todayStart.toISOString()).toBe("2026-10-01T18:30:00.000Z");
    expect(weekStart.toISOString()).toBe("2026-09-25T18:30:00.000Z");
  });
  it("rolls over at IST midnight, not UTC midnight", () => {
    const lateUtc = new Date("2026-10-02T20:00:00Z"); // 01:30 IST on 3 Oct
    expect(kpiWindow(lateUtc).todayStart.toISOString()).toBe("2026-10-02T18:30:00.000Z");
  });
});

describe("GMV summary", () => {
  const since = new Date("2026-10-01T18:30:00Z");
  const orders = [
    { total: 100000, status: "placed", payment_status: "paid", placed_at: "2026-10-02T01:00:00Z" },
    { total: 50000, status: "placed", payment_status: "cod_pending", placed_at: "2026-10-02T02:00:00Z" },
    { total: 70000, status: "cancelled", payment_status: "refunded", placed_at: "2026-10-02T03:00:00Z" },
    { total: 20000, status: "placed", payment_status: "pending", placed_at: "2026-10-02T04:00:00Z" },
    { total: 90000, status: "delivered", payment_status: "paid", placed_at: "2026-09-20T04:00:00Z" },
  ];
  it("only counts paid/COD-confirmed, non-cancelled orders in the window", () => {
    expect(countsTowardGmv(orders[0])).toBe(true);
    expect(countsTowardGmv(orders[2])).toBe(false);
    expect(countsTowardGmv(orders[3])).toBe(false);
    expect(summariseOrders(orders, since)).toEqual({ orders: 4, gmv: 150000, aov: 75000 });
  });
  it("returns zero AOV with no paid orders", () => {
    expect(summariseOrders([orders[3]], since)).toEqual({ orders: 1, gmv: 0, aov: 0 });
  });
});

describe("flashSalePhase", () => {
  const sale = { isActive: true, startsAt: "2026-10-02T10:00:00Z", endsAt: "2026-10-02T12:00:00Z" };
  it("reports scheduled, live, ended and inactive", async () => {
    const { flashSalePhase } = await import("@/lib/admin/rules");
    expect(flashSalePhase(sale, new Date("2026-10-02T09:00:00Z"))).toBe("scheduled");
    expect(flashSalePhase(sale, new Date("2026-10-02T11:00:00Z"))).toBe("live");
    expect(flashSalePhase(sale, new Date("2026-10-02T13:00:00Z"))).toBe("ended");
    expect(flashSalePhase({ ...sale, isActive: false }, new Date("2026-10-02T11:00:00Z"))).toBe("inactive");
  });
});
