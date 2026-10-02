import { describe, expect, it } from "vitest";
import {
  canEditReview,
  cardLabel,
  couponExpiringSoon,
  expiringSoon,
  groupNotifications,
  isValidVpa,
  notificationGroup,
  proDaysLeft,
} from "@/lib/loyalty/rules";

const NOW = new Date("2026-10-02T06:00:00.000Z"); // 11:30 AM IST

const days = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000).toISOString();

describe("expiringSoon", () => {
  it("returns only positive rows expiring within 30 days, soonest first", () => {
    const ledger = [
      { id: "a", delta: 100, expires_at: days(25) },
      { id: "b", delta: 50, expires_at: days(5) },
      { id: "c", delta: -30, expires_at: days(2) },
      { id: "d", delta: 80, expires_at: days(45) },
      { id: "e", delta: 20, expires_at: days(-1) },
      { id: "f", delta: 10, expires_at: null },
    ];
    expect(expiringSoon(ledger, NOW).map((r) => r.id)).toEqual(["b", "a"]);
  });
  it("honours a custom horizon", () => {
    const ledger = [{ delta: 10, expires_at: days(10) }];
    expect(expiringSoon(ledger, NOW, 7)).toHaveLength(0);
    expect(expiringSoon(ledger, NOW, 14)).toHaveLength(1);
  });
});

describe("groupNotifications", () => {
  it("splits Today vs Earlier on the IST calendar day", () => {
    const list = [
      { id: "t1", created_at: "2026-10-02T01:00:00.000Z" }, // 6:30 AM IST today
      { id: "t2", created_at: "2026-10-01T19:00:00.000Z" }, // 12:30 AM IST today
      { id: "e1", created_at: "2026-10-01T18:00:00.000Z" }, // 11:30 PM IST yesterday
      { id: "e2", created_at: "2026-09-20T10:00:00.000Z" },
    ];
    const g = groupNotifications(list, NOW);
    expect(g.today.map((n) => n.id)).toEqual(["t1", "t2"]);
    expect(g.earlier.map((n) => n.id)).toEqual(["e1", "e2"]);
  });
  it("maps notification types to filter groups", () => {
    expect(notificationGroup("order_shipped")).toBe("orders");
    expect(notificationGroup("refund_processed")).toBe("orders");
    expect(notificationGroup("flash_sale")).toBe("offers");
    expect(notificationGroup("price_drop")).toBe("offers");
    expect(notificationGroup("tier_upgrade")).toBe("rewards");
    expect(notificationGroup("referral_reward")).toBe("rewards");
    expect(notificationGroup("something_new")).toBe("offers");
  });
});

describe("canEditReview", () => {
  it("allows edits within 7 days of creation and blocks after", () => {
    expect(canEditReview(days(-6), NOW)).toBe(true);
    expect(canEditReview(days(-7), NOW)).toBe(true);
    expect(canEditReview(days(-7.01), NOW)).toBe(false);
    expect(canEditReview(days(-30), NOW)).toBe(false);
  });
});

describe("couponExpiringSoon", () => {
  it("flags coupons ending within 3 days, not expired or open-ended ones", () => {
    expect(couponExpiringSoon(days(2), NOW)).toBe(true);
    expect(couponExpiringSoon(days(3), NOW)).toBe(true);
    expect(couponExpiringSoon(days(4), NOW)).toBe(false);
    expect(couponExpiringSoon(days(-1), NOW)).toBe(false);
    expect(couponExpiringSoon(null, NOW)).toBe(false);
  });
});

describe("payment method helpers", () => {
  it("validates UPI ids", () => {
    expect(isValidVpa("priya.s@okicici")).toBe(true);
    expect(isValidVpa("9876543210@ybl")).toBe(true);
    expect(isValidVpa("a@ybl")).toBe(false);
    expect(isValidVpa("priya@1")).toBe(false);
    expect(isValidVpa("priya")).toBe(false);
  });
  it("builds a masked card label", () => {
    expect(cardLabel("Visa", "4242", "12/28")).toBe("Visa •••• 4242 · 12/28");
  });
});

describe("proDaysLeft", () => {
  it("counts remaining days and clamps at 0", () => {
    expect(proDaysLeft(days(10), NOW)).toBe(10);
    expect(proDaysLeft(days(-1), NOW)).toBe(0);
    expect(proDaysLeft(null, NOW)).toBe(0);
  });
});
