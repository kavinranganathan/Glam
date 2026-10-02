/**
 * Pure account/loyalty rules shared by the account pages, API routes and tests.
 * No I/O here so the behaviour is unit-testable (see tests/loyalty/service-rules.test.ts).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export interface LedgerLike {
  delta: number;
  expires_at: string | null;
}

/** Positive ledger rows whose expiry falls within the next `days` days (default 30), soonest first. */
export function expiringSoon<T extends LedgerLike>(ledger: T[], now: Date = new Date(), days = 30): T[] {
  const horizon = now.getTime() + days * DAY_MS;
  return ledger
    .filter((row) => row.delta > 0 && row.expires_at !== null)
    .filter((row) => {
      const t = new Date(row.expires_at as string).getTime();
      return t > now.getTime() && t <= horizon;
    })
    .sort((a, b) => new Date(a.expires_at as string).getTime() - new Date(b.expires_at as string).getTime());
}

export interface NotificationLike {
  created_at: string;
}

/** Splits notifications into Today / Earlier buckets using the India calendar day. */
export function groupNotifications<T extends NotificationLike>(list: T[], now: Date = new Date()): { today: T[]; earlier: T[] } {
  const todayKey = istDayKey(now);
  const today: T[] = [];
  const earlier: T[] = [];
  for (const n of list) {
    if (istDayKey(new Date(n.created_at)) === todayKey) today.push(n);
    else earlier.push(n);
  }
  return { today, earlier };
}

function istDayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export const REVIEW_EDIT_WINDOW_DAYS = 7;

/** Reviews can be edited or deleted for 7 days after creation (PRD §8.10). */
export function canEditReview(createdAt: string | Date, now: Date = new Date()): boolean {
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  return now.getTime() - created.getTime() <= REVIEW_EDIT_WINDOW_DAYS * DAY_MS;
}

export type NotificationGroup = "orders" | "offers" | "rewards";

const GROUP_OF: Record<string, NotificationGroup> = {
  order_confirmed: "orders",
  order_shipped: "orders",
  out_for_delivery: "orders",
  delivered: "orders",
  order_cancelled: "orders",
  return_update: "orders",
  refund_processed: "orders",
  support: "orders",
  back_in_stock: "offers",
  price_drop: "offers",
  flash_sale: "offers",
  abandoned_cart: "offers",
  browse_abandonment: "offers",
  weekly_digest: "offers",
  coupon: "offers",
  brand_launch: "offers",
  tier_upgrade: "rewards",
  points_expiring: "rewards",
  referral_reward: "rewards",
  welcome: "rewards",
  review_prompt: "rewards",
};

/** Filter-chip group for a notification type. Unknown types fall into "offers". */
export function notificationGroup(type: string): NotificationGroup {
  return GROUP_OF[type] ?? "offers";
}

/** Coupon is "expiring soon" when it ends within `days` days (default 3) and has not already ended. */
export function couponExpiringSoon(endsAt: string | null, now: Date = new Date(), days = 3): boolean {
  if (!endsAt) return false;
  const t = new Date(endsAt).getTime();
  return t > now.getTime() && t - now.getTime() <= days * DAY_MS;
}

export const VPA_REGEX = /^[\w.-]{2,}@[a-zA-Z]{2,}$/;

export function isValidVpa(vpa: string): boolean {
  return VPA_REGEX.test(vpa.trim());
}

/** Masked label stored for a saved card. Only brand, last 4 and expiry ever leave the browser. */
export function cardLabel(brand: string, last4: string, expiry: string): string {
  return `${brand} •••• ${last4} · ${expiry}`;
}

/** Days remaining until a Pro membership lapses (0 when expired or absent). */
export function proDaysLeft(proUntil: string | null, now: Date = new Date()): number {
  if (!proUntil) return 0;
  return Math.max(0, Math.ceil((new Date(proUntil).getTime() - now.getTime()) / DAY_MS));
}
