/**
 * Pure return/order helpers shared by the server services, API routes and client stepper.
 * No database or framework imports so they can be unit tested.
 */
import type { OrderStatus } from "@/lib/orders/state-machine";
import type { IneligibleReason, OrderFilter, ReturnableItemState, ReturnPayloadInput } from "@/lib/orders/views";
import { isReturnable, photoRequired, RETURN_REASONS, returnDeadline, type ReturnReason } from "./policy";

export const MAX_RETURN_PHOTOS = 3;

export interface ReturnableItemInput {
  id: string;
  qty: number;
  returnedQty: number;
  nonReturnable: boolean;
  returnWindowDays: number;
}

/** Per-item eligibility: non-returnable flag → window → remaining quantity. */
export function returnableItemState(item: ReturnableItemInput, deliveredAt: Date | string | null, now: Date = new Date()): ReturnableItemState {
  const delivered = deliveredAt ? new Date(deliveredAt) : null;
  const remainingQty = Math.max(0, item.qty - item.returnedQty);
  const deadline = delivered ? returnDeadline(delivered, item.returnWindowDays).toISOString() : null;
  let reason: IneligibleReason | null = null;
  if (item.nonReturnable) reason = "non_returnable";
  else if (!delivered) reason = "not_delivered";
  else if (!isReturnable(delivered, now, item.returnWindowDays, false)) reason = "window_closed";
  else if (remainingQty <= 0) reason = "already_returned";
  return { orderItemId: item.id, eligible: reason === null, reason, deadline, remainingQty };
}

export const INELIGIBLE_LABEL: Record<IneligibleReason, string> = {
  non_returnable: "Not eligible for return",
  window_closed: "Return window closed",
  already_returned: "Already returned",
  not_delivered: "Not delivered yet",
};

export type ReturnValidation =
  | { ok: true; payload: ReturnPayloadInput & { reason: ReturnReason; photos: string[]; comment: string | null } }
  | { ok: false; code: string; message: string };

export interface ReturnValidationContext {
  status: OrderStatus;
  deliveredAt: string | null;
  items: ReturnableItemInput[];
}

/**
 * Validates a return request against the order before it reaches `create_return`.
 * Mirrors the SQL guards (RETURN_NOT_ALLOWED / NON_RETURNABLE / RETURN_WINDOW_CLOSED / QTY_EXCEEDS)
 * and adds the UI-only rules (reason list, photo requirement, photo cap).
 */
export function validateReturnPayload(payload: ReturnPayloadInput, order: ReturnValidationContext, now: Date = new Date()): ReturnValidation {
  if (order.status !== "delivered") {
    return { ok: false, code: "RETURN_NOT_ALLOWED", message: "Returns are only available for delivered orders." };
  }
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return { ok: false, code: "NO_ITEMS", message: "Select at least one item to return." };
  }
  const reason = payload.reason as ReturnReason;
  if (!RETURN_REASONS.includes(reason)) {
    return { ok: false, code: "INVALID_REASON", message: "Please choose a reason for the return." };
  }
  const photos = (payload.photos ?? []).filter((p) => typeof p === "string" && p.length > 0);
  if (photoRequired(reason) && photos.length === 0) {
    return { ok: false, code: "PHOTO_REQUIRED", message: `Please add at least one photo for "${reason}" returns.` };
  }
  if (photos.length > MAX_RETURN_PHOTOS) {
    return { ok: false, code: "TOO_MANY_PHOTOS", message: `You can add up to ${MAX_RETURN_PHOTOS} photos.` };
  }
  if (payload.refund_method !== "original" && payload.refund_method !== "wallet") {
    return { ok: false, code: "INVALID_REFUND_METHOD", message: "Please choose how you would like to be refunded." };
  }
  const seen = new Set<string>();
  for (const line of payload.items) {
    if (seen.has(line.order_item_id)) {
      return { ok: false, code: "DUPLICATE_ITEM", message: "An item was listed twice." };
    }
    seen.add(line.order_item_id);
    const item = order.items.find((i) => i.id === line.order_item_id);
    if (!item) return { ok: false, code: "ITEM_NOT_FOUND", message: "Item not found." };
    if (!Number.isInteger(line.qty) || line.qty < 1) {
      return { ok: false, code: "INVALID_QTY", message: "Quantity must be at least 1." };
    }
    const state = returnableItemState(item, order.deliveredAt, now);
    if (state.reason === "non_returnable") return { ok: false, code: "NON_RETURNABLE", message: "One of the selected items is not eligible for return." };
    if (state.reason === "window_closed") return { ok: false, code: "RETURN_WINDOW_CLOSED", message: "The return window has closed for one of the selected items." };
    if (state.reason === "not_delivered") return { ok: false, code: "RETURN_NOT_ALLOWED", message: "Returns are only available for delivered orders." };
    if (line.qty > state.remainingQty) return { ok: false, code: "QTY_EXCEEDS", message: "Return quantity exceeds what was ordered." };
  }
  return {
    ok: true,
    payload: {
      items: payload.items.map((l) => ({ order_item_id: l.order_item_id, qty: l.qty })),
      reason,
      comment: payload.comment?.trim() ? payload.comment.trim() : null,
      refund_method: payload.refund_method,
      photos,
      pickup_address: payload.pickup_address ?? null,
    },
  };
}

/** Statuses that count as "Active" on the orders list. */
export const ACTIVE_STATUSES: OrderStatus[] = ["placed", "processing", "shipped", "out_for_delivery", "failed_delivery"];
export const RETURN_STATUSES: OrderStatus[] = ["return_initiated", "returned", "refunded"];

/** Expands a filter chip into the list of order statuses it covers; null means no filter. */
export function filterStatuses(filter: OrderFilter | undefined): OrderStatus[] | null {
  switch (filter) {
    case undefined:
    case "all":
      return null;
    case "active":
      return ACTIVE_STATUSES;
    case "delivered":
      return ["delivered"];
    case "cancelled":
      return ["cancelled"];
    case "returns":
      return RETURN_STATUSES;
    default:
      return [filter];
  }
}

/** Next `count` calendar dates after `now` (IST), formatted as YYYY-MM-DD, for delivery reschedule. */
export function rescheduleDates(now: Date = new Date(), count = 3): string[] {
  const out: string[] = [];
  for (let i = 1; i <= count; i++) {
    const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    out.push(toISTDateString(d));
  }
  return out;
}

export function toISTDateString(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return parts; // en-CA yields YYYY-MM-DD
}

/** True when the date string is one of the offered reschedule dates. */
export function isValidRescheduleDate(date: string, now: Date = new Date()): boolean {
  return rescheduleDates(now).includes(date);
}

/** Sum of unit prices × qty for the requested lines, as the refund preview. */
export function refundPreview(lines: Array<{ order_item_id: string; qty: number }>, items: Array<{ id: string; unitPrice: number }>): number {
  return lines.reduce((sum, l) => {
    const it = items.find((i) => i.id === l.order_item_id);
    return it ? sum + it.unitPrice * l.qty : sum;
  }, 0);
}
