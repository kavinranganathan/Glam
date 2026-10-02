/**
 * Pure admin helpers (no I/O). Shared by server services, route handlers and client forms.
 */
import { TRANSITIONS, type OrderStatus } from "@/lib/orders/state-machine";

export type ReturnStatus = "requested" | "pickup_scheduled" | "picked_up" | "received" | "refunded" | "rejected";

export interface SimulationStep {
  status: OrderStatus;
  note: string;
}

/** Fulfilment happy path used by "Simulate fulfilment". */
export const SIMULATION_STEPS: readonly SimulationStep[] = [
  { status: "processing", note: "Packed at Bhiwandi FC" },
  { status: "shipped", note: "Handed to Delhivery" },
  { status: "out_for_delivery", note: "Out with delivery partner" },
  { status: "delivered", note: "Delivered — OTP verified" },
];

/** Statuses an admin may move an order to from `status` (mirrors the DB `order_status_allowed`). */
export function nextStatusesFor(status: OrderStatus): OrderStatus[] {
  return [...(TRANSITIONS[status] ?? [])];
}

/**
 * Remaining happy-path steps (with courier notes) from the current status.
 * Returns [] when the order is delivered, cancelled or otherwise off the happy path.
 */
export function simulationPlan(status: OrderStatus): SimulationStep[] {
  if (status === "placed") return [...SIMULATION_STEPS];
  if (status === "failed_delivery") {
    return [{ status: "out_for_delivery", note: "Re-attempting delivery" }, SIMULATION_STEPS[3]];
  }
  const idx = SIMULATION_STEPS.findIndex((s) => s.status === status);
  if (idx === -1) return [];
  return SIMULATION_STEPS.slice(idx + 1);
}

/** Admin transitions for returns (mirrors `advance_return`). */
export const RETURN_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  requested: ["pickup_scheduled", "rejected"],
  pickup_scheduled: ["picked_up", "rejected"],
  picked_up: ["received", "rejected"],
  received: ["refunded"],
  refunded: [],
  rejected: [],
};

export function nextReturnStatusesFor(status: ReturnStatus): ReturnStatus[] {
  return [...(RETURN_TRANSITIONS[status] ?? [])];
}

export function canAdvanceReturn(from: ReturnStatus, to: ReturnStatus): boolean {
  return RETURN_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Rupees (as typed into a form) → integer paise. Rejects NaN/negative input with 0. */
export function rupeesToPaise(rupees: number | string): number {
  const n = typeof rupees === "string" ? Number(rupees.replace(/[₹,\s]/g, "")) : rupees;
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function paiseToRupees(paise: number | null | undefined): number {
  if (!paise) return 0;
  return Math.round(paise) / 100;
}

/** Default flash-sale price: 30% off, rounded down to the nearest rupee, never below ₹1. */
export function defaultSalePrice(pricePaise: number, discountPct = 30): number {
  const raw = pricePaise * (1 - discountPct / 100);
  return Math.max(100, Math.floor(raw / 100) * 100);
}

/** Coupon codes are stored upper-case without surrounding whitespace. */
export function normaliseCouponCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

/** Start of today (IST) and the start of the rolling 7-day window (today inclusive). */
export function kpiWindow(now: Date = new Date()): { todayStart: Date; weekStart: Date } {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const todayStart = new Date(`${ymd}T00:00:00+05:30`);
  const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
  return { todayStart, weekStart };
}

export interface GmvOrder {
  total: number;
  status: string;
  payment_status: string;
  placed_at: string;
}

/** Orders that count towards GMV: paid / COD-confirmed and not cancelled. */
export function countsTowardGmv(o: Pick<GmvOrder, "status" | "payment_status">): boolean {
  return (o.payment_status === "paid" || o.payment_status === "cod_pending") && o.status !== "cancelled";
}

export function summariseOrders(orders: GmvOrder[], since: Date): { orders: number; gmv: number; aov: number } {
  const sinceMs = since.getTime();
  let count = 0;
  let gmv = 0;
  for (const o of orders) {
    if (new Date(o.placed_at).getTime() < sinceMs) continue;
    count += 1;
    if (countsTowardGmv(o)) gmv += o.total;
  }
  const paidCount = orders.filter((o) => new Date(o.placed_at).getTime() >= sinceMs && countsTowardGmv(o)).length;
  return { orders: count, gmv, aov: paidCount ? Math.round(gmv / paidCount) : 0 };
}

export const LOW_STOCK_THRESHOLD = 3;
export const BRAND_RESPONSE_MAX = 500;

export type FlashPhase = "live" | "scheduled" | "ended" | "inactive";

/** Lifecycle phase of a flash sale at `now`. */
export function flashSalePhase(sale: { isActive: boolean; startsAt: string; endsAt: string }, now: Date = new Date()): FlashPhase {
  if (!sale.isActive) return "inactive";
  const t = now.getTime();
  if (t < new Date(sale.startsAt).getTime()) return "scheduled";
  if (t > new Date(sale.endsAt).getTime()) return "ended";
  return "live";
}
