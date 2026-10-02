import { describe, expect, it } from "vitest";
import {
  filterStatuses,
  isValidRescheduleDate,
  refundPreview,
  rescheduleDates,
  returnableItemState,
  validateReturnPayload,
} from "@/lib/returns/rules";

const delivered = "2026-10-01T10:00:00.000Z";
const now = new Date("2026-10-03T10:00:00.000Z");

const beauty = { id: "a", qty: 2, returnedQty: 0, nonReturnable: false, returnWindowDays: 30 };
const wellness = { id: "b", qty: 1, returnedQty: 0, nonReturnable: false, returnWindowDays: 7 };
const final = { id: "c", qty: 1, returnedQty: 0, nonReturnable: true, returnWindowDays: 30 };
const returned = { id: "d", qty: 1, returnedQty: 1, nonReturnable: false, returnWindowDays: 30 };
const order = { status: "delivered" as const, deliveredAt: delivered, items: [beauty, wellness, final, returned] };

describe("returnableItemState", () => {
  it("marks items inside the window as eligible with a deadline", () => {
    const s = returnableItemState(beauty, delivered, now);
    expect(s.eligible).toBe(true);
    expect(s.reason).toBeNull();
    expect(s.deadline).toBe("2026-10-31T10:00:00.000Z");
    expect(s.remainingQty).toBe(2);
  });
  it("flags non-returnable, closed-window, fully-returned and undelivered items", () => {
    expect(returnableItemState(final, delivered, now).reason).toBe("non_returnable");
    expect(returnableItemState(wellness, delivered, new Date("2026-10-09T10:00:01.000Z")).reason).toBe("window_closed");
    expect(returnableItemState(returned, delivered, now).reason).toBe("already_returned");
    expect(returnableItemState(beauty, null, now).reason).toBe("not_delivered");
  });
});

describe("validateReturnPayload", () => {
  it("accepts a well-formed request and normalises it", () => {
    const r = validateReturnPayload(
      { items: [{ order_item_id: "a", qty: 1 }], reason: "Changed mind", comment: "  too dark  ", refund_method: "wallet" },
      order,
      now,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.comment).toBe("too dark");
      expect(r.payload.photos).toEqual([]);
      expect(r.payload.refund_method).toBe("wallet");
    }
  });
  it("requires photos for Damaged / Wrong item / Defective", () => {
    for (const reason of ["Damaged", "Wrong item", "Defective"]) {
      const r = validateReturnPayload({ items: [{ order_item_id: "a", qty: 1 }], reason, refund_method: "original" }, order, now);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe("PHOTO_REQUIRED");
    }
    const ok = validateReturnPayload(
      { items: [{ order_item_id: "a", qty: 1 }], reason: "Damaged", refund_method: "original", photos: ["/uploads/x.jpg"] },
      order,
      now,
    );
    expect(ok.ok).toBe(true);
  });
  it("rejects unknown reasons, empty selections and more than 3 photos", () => {
    expect(validateReturnPayload({ items: [{ order_item_id: "a", qty: 1 }], reason: "Nope", refund_method: "original" }, order, now)).toMatchObject({ code: "INVALID_REASON" });
    expect(validateReturnPayload({ items: [], reason: "Changed mind", refund_method: "original" }, order, now)).toMatchObject({ code: "NO_ITEMS" });
    expect(
      validateReturnPayload(
        { items: [{ order_item_id: "a", qty: 1 }], reason: "Damaged", refund_method: "original", photos: ["1", "2", "3", "4"] },
        order,
        now,
      ),
    ).toMatchObject({ code: "TOO_MANY_PHOTOS" });
  });
  it("mirrors the SQL guards: qty, window, non-returnable, delivered-only", () => {
    expect(validateReturnPayload({ items: [{ order_item_id: "a", qty: 3 }], reason: "Changed mind", refund_method: "original" }, order, now)).toMatchObject({ code: "QTY_EXCEEDS" });
    expect(validateReturnPayload({ items: [{ order_item_id: "c", qty: 1 }], reason: "Changed mind", refund_method: "original" }, order, now)).toMatchObject({ code: "NON_RETURNABLE" });
    expect(validateReturnPayload({ items: [{ order_item_id: "d", qty: 1 }], reason: "Changed mind", refund_method: "original" }, order, now)).toMatchObject({ code: "QTY_EXCEEDS" });
    expect(
      validateReturnPayload({ items: [{ order_item_id: "b", qty: 1 }], reason: "Changed mind", refund_method: "original" }, order, new Date("2026-10-20T00:00:00Z")),
    ).toMatchObject({ code: "RETURN_WINDOW_CLOSED" });
    expect(validateReturnPayload({ items: [{ order_item_id: "a", qty: 1 }], reason: "Changed mind", refund_method: "original" }, { ...order, status: "shipped" }, now)).toMatchObject({
      code: "RETURN_NOT_ALLOWED",
    });
  });
  it("rejects duplicate lines and unknown items", () => {
    expect(
      validateReturnPayload(
        { items: [{ order_item_id: "a", qty: 1 }, { order_item_id: "a", qty: 1 }], reason: "Changed mind", refund_method: "original" },
        order,
        now,
      ),
    ).toMatchObject({ code: "DUPLICATE_ITEM" });
    expect(validateReturnPayload({ items: [{ order_item_id: "zzz", qty: 1 }], reason: "Changed mind", refund_method: "original" }, order, now)).toMatchObject({ code: "ITEM_NOT_FOUND" });
  });
});

describe("list filters and reschedule dates", () => {
  it("expands filter chips to statuses", () => {
    expect(filterStatuses("all")).toBeNull();
    expect(filterStatuses(undefined)).toBeNull();
    expect(filterStatuses("active")).toEqual(["placed", "processing", "shipped", "out_for_delivery", "failed_delivery"]);
    expect(filterStatuses("returns")).toEqual(["return_initiated", "returned", "refunded"]);
    expect(filterStatuses("shipped")).toEqual(["shipped"]);
  });
  it("offers the next three IST dates and validates against them", () => {
    const base = new Date("2026-10-02T12:00:00.000Z");
    const dates = rescheduleDates(base);
    expect(dates).toEqual(["2026-10-03", "2026-10-04", "2026-10-05"]);
    expect(isValidRescheduleDate("2026-10-04", base)).toBe(true);
    expect(isValidRescheduleDate("2026-10-02", base)).toBe(false);
  });
  it("previews the refund as unit price × qty", () => {
    expect(refundPreview([{ order_item_id: "a", qty: 2 }, { order_item_id: "x", qty: 1 }], [{ id: "a", unitPrice: 49900 }])).toBe(99800);
  });
});
