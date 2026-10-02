import { describe, expect, it } from "vitest";
import { availableSlots, deliveryFee, estimatedDelivery, slotSurcharge } from "@/lib/pricing/delivery";
import type { PincodeRecord } from "@/lib/pricing/types";

const pin = (over: Partial<PincodeRecord> = {}): PincodeRecord => ({
  pincode: "560001",
  city: "Bengaluru",
  state: "KA",
  same_day: true,
  next_day: true,
  delivery_fee: 4900,
  cod_available: true,
  standard_days: 2,
  courier: "Bluedart",
  ...over,
});

describe("deliveryFee", () => {
  it("charges the pincode fee below threshold for base tier", () => {
    expect(deliveryFee(50000, "base", false, pin({ delivery_fee: 5900 }))).toEqual({ fee: 5900, label: "₹59", reason: "paid" });
  });
  it("defaults to ₹49 without a pincode", () => {
    expect(deliveryFee(50000, "base", false, null).fee).toBe(4900);
  });
  it("is free at threshold, for Silver+, for Pro and with a free-delivery coupon", () => {
    expect(deliveryFee(99900, "base", false, pin()).reason).toBe("free_threshold");
    expect(deliveryFee(100, "silver", false, pin()).reason).toBe("free_tier");
    expect(deliveryFee(100, "base", true, pin()).reason).toBe("free_pro");
    expect(deliveryFee(100, "base", false, pin(), true).reason).toBe("free_coupon");
  });
});

describe("slots", () => {
  it("offers same-day only before noon IST and only where serviceable", () => {
    const morning = new Date("2026-10-02T04:00:00Z"); // 09:30 IST
    const evening = new Date("2026-10-02T09:00:00Z"); // 14:30 IST
    expect(availableSlots(pin(), morning)).toEqual(["standard", "next_day", "same_day"]);
    expect(availableSlots(pin(), evening)).toEqual(["standard", "next_day"]);
    expect(availableSlots(pin({ same_day: false, next_day: false }), morning)).toEqual(["standard"]);
    expect(availableSlots(null, morning)).toEqual(["standard"]);
  });
  it("surcharges faster slots unless the tier covers them", () => {
    expect(slotSurcharge("standard", "base", false)).toBe(0);
    expect(slotSurcharge("next_day", "base", false)).toBe(6900);
    expect(slotSurcharge("next_day", "gold", false)).toBe(0);
    expect(slotSurcharge("same_day", "gold", false)).toBe(9900);
    expect(slotSurcharge("same_day", "platinum", false)).toBe(0);
  });
  it("estimates delivery dates per slot", () => {
    const now = new Date("2026-10-02T04:00:00Z");
    expect(estimatedDelivery("same_day", pin(), now).toISOString().slice(0, 10)).toBe("2026-10-02");
    expect(estimatedDelivery("next_day", pin(), now).toISOString().slice(0, 10)).toBe("2026-10-03");
    expect(estimatedDelivery("standard", pin({ standard_days: 4 }), now).toISOString().slice(0, 10)).toBe("2026-10-06");
  });
});
