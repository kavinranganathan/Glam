import "server-only";

import { ApiError } from "@/lib/api/respond";
import { addItem } from "@/lib/cart/service";
import { notifyUser } from "@/lib/notifications/service";
import { filterStatuses, isValidRescheduleDate } from "@/lib/returns/rules";
import { serviceClient } from "@/lib/supabase/service";
import type { Tables } from "@/lib/supabase/types";
import { formatShortDate } from "@/lib/utils/dates";
import { availableActions, canCancel, type OrderStatus } from "./state-machine";
import type { OrderAddress, OrderDetail, OrderEventView, OrderFilter, OrderIdentity, OrderItemView, OrderSummary } from "./views";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: string): boolean {
  return UUID_RE.test(v);
}

/** Throws so `handle()` maps Postgres `CODE:detail` messages to friendly responses. */
export function throwDb(error: { message: string; code?: string } | null): never {
  throw new Error(error?.message ?? "Database error");
}

const SUMMARY_SELECT =
  "id, order_number, status, placed_at, total, payment_method, payment_status, estimated_delivery, order_items(name, image, qty)" as const;

type SummaryRow = Pick<Tables<"orders">, "id" | "order_number" | "status" | "placed_at" | "total" | "payment_method" | "payment_status" | "estimated_delivery"> & {
  order_items: Array<Pick<Tables<"order_items">, "name" | "image" | "qty">>;
};

function toSummary(row: SummaryRow): OrderSummary {
  const items = row.order_items ?? [];
  const images = items.map((i) => i.image).filter((i): i is string => Boolean(i)).slice(0, 3);
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    placedAt: row.placed_at,
    total: row.total,
    itemCount: items.reduce((n, i) => n + i.qty, 0),
    firstImage: images[0] ?? null,
    firstName: items[0]?.name ?? "Order",
    images,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    estimatedDelivery: row.estimated_delivery,
  };
}

export interface ListOrdersOptions {
  status?: OrderFilter;
  /** Order number search (case-insensitive substring). */
  q?: string;
  page?: number;
  pageSize?: number;
}

export async function listOrders(userId: string, opts: ListOrdersOptions = {}): Promise<{ items: OrderSummary[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Math.floor(opts.pageSize ?? 10)));
  const from = (page - 1) * pageSize;
  let q = serviceClient().from("orders").select(SUMMARY_SELECT, { count: "exact" }).eq("user_id", userId);
  const statuses = filterStatuses(opts.status);
  if (statuses) q = q.in("status", statuses);
  const term = opts.q?.trim().replace(/[%_]/g, "");
  if (term) q = q.ilike("order_number", `%${term}%`);
  const { data, error, count } = await q.order("placed_at", { ascending: false }).range(from, from + pageSize - 1);
  if (error) throwDb(error);
  return { items: (data as unknown as SummaryRow[]).map(toSummary), total: count ?? 0, page, pageSize };
}

function owns(order: Pick<Tables<"orders">, "user_id" | "session_id">, identity: OrderIdentity): boolean {
  if (identity.user && order.user_id === identity.user.id) return true;
  if (!identity.user && identity.sessionId && order.session_id && order.session_id === identity.sessionId) return true;
  return false;
}

/** Full order view for the owner; null when missing or not owned. */
export async function getOrder(orderId: string, identity: OrderIdentity): Promise<OrderDetail | null> {
  if (!isUuid(orderId)) return null;
  const db = serviceClient();
  const { data: order, error } = await db.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (error) throwDb(error);
  if (!order || !owns(order, identity)) return null;

  const [itemsRes, eventsRes, returnsRes] = await Promise.all([
    db.from("order_items").select("*").eq("order_id", orderId).order("id"),
    db.from("order_events").select("status, note, created_at").eq("order_id", orderId).order("created_at", { ascending: true }),
    db.from("returns").select("id, status, created_at, refund_amount, refund_method").eq("order_id", orderId).order("created_at", { ascending: false }),
  ]);
  if (itemsRes.error) throwDb(itemsRes.error);
  if (eventsRes.error) throwDb(eventsRes.error);
  if (returnsRes.error) throwDb(returnsRes.error);

  const itemIds = itemsRes.data.map((i) => i.id);
  const reviewed = new Set<string>();
  if (itemIds.length) {
    const { data: reviews } = await db.from("reviews").select("order_item_id").in("order_item_id", itemIds);
    for (const r of reviews ?? []) if (r.order_item_id) reviewed.add(r.order_item_id);
  }

  const items: OrderItemView[] = itemsRes.data.map((i) => ({
    id: i.id,
    productId: i.product_id,
    variantId: i.variant_id,
    slug: i.product_slug,
    name: i.name,
    brandName: i.brand_name,
    variantName: i.variant_name,
    image: i.image,
    qty: i.qty,
    unitPrice: i.unit_price,
    mrp: i.mrp,
    lineTotal: i.line_total,
    returnedQty: i.returned_qty,
    nonReturnable: i.non_returnable,
    returnWindowDays: i.return_window_days,
    categoryRoot: i.category_root,
    reviewed: reviewed.has(i.id),
  }));

  const summary = toSummary({ ...order, order_items: items.map((i) => ({ name: i.name, image: i.image, qty: i.qty })) });
  const placedAt = new Date(order.placed_at);
  return {
    ...summary,
    userId: order.user_id,
    sessionId: order.session_id,
    guestEmail: order.guest_email,
    items,
    address: (order.address ?? {}) as OrderAddress,
    subtotal: order.subtotal,
    itemDiscount: order.item_discount,
    couponCode: order.coupon_code,
    couponDiscount: order.coupon_discount,
    pointsRedeemed: order.points_redeemed,
    pointsDiscount: order.points_discount,
    deliveryFee: order.delivery_fee,
    codFee: order.cod_fee,
    deliverySlot: order.delivery_slot,
    courier: order.courier,
    awb: order.awb,
    shippedAt: order.shipped_at,
    deliveredAt: order.delivered_at,
    cancelledAt: order.cancelled_at,
    cancelReason: order.cancel_reason,
    events: eventsRes.data.map((e) => ({ status: e.status, note: e.note, at: e.created_at })),
    returns: returnsRes.data.map((r) => ({ id: r.id, status: r.status, createdAt: r.created_at, refundAmount: r.refund_amount, refundMethod: r.refund_method })),
    actions: availableActions(order.status, placedAt),
  };
}

export async function getOrderTimeline(orderId: string): Promise<OrderEventView[]> {
  if (!isUuid(orderId)) return [];
  const { data, error } = await serviceClient().from("order_events").select("status, note, created_at").eq("order_id", orderId).order("created_at", { ascending: true });
  if (error) throwDb(error);
  return data.map((e) => ({ status: e.status, note: e.note, at: e.created_at }));
}

async function requireOwnedOrder(orderId: string, identity: OrderIdentity): Promise<OrderDetail> {
  const order = await getOrder(orderId, identity);
  if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
  return order;
}

/** Cancels within the 30-minute / processing window. Mirrors `canCancel` then calls `cancel_order`. */
export async function cancelOrder(orderId: string, identity: OrderIdentity, reason: string): Promise<OrderDetail> {
  const order = await requireOwnedOrder(orderId, identity);
  if (!canCancel(order.status, new Date(order.placedAt))) {
    throw new ApiError(409, "CANCEL_NOT_ALLOWED", "This order can no longer be cancelled.");
  }
  const { error } = await serviceClient().rpc("cancel_order", { p_order: orderId, p_reason: reason.trim() || "Cancelled by customer" });
  if (error) throwDb(error);
  return (await getOrder(orderId, identity)) ?? order;
}

/** Re-adds every line to the bag; unavailable variants are skipped and reported by name. */
export async function reorder(orderId: string, identity: OrderIdentity): Promise<{ added: number; skipped: string[] }> {
  const order = await requireOwnedOrder(orderId, identity);
  const sessionId = identity.sessionId ?? crypto.randomUUID();
  const cartIdentity = { user: identity.user, sessionId };
  let added = 0;
  const skipped: string[] = [];
  for (const item of order.items) {
    if (!item.variantId) {
      skipped.push(item.name);
      continue;
    }
    try {
      await addItem(cartIdentity, item.variantId, item.qty);
      added++;
    } catch (e) {
      if (e instanceof ApiError && (e.code === "OUT_OF_STOCK" || e.code === "VARIANT_NOT_FOUND")) {
        skipped.push(item.name);
      } else {
        throw e;
      }
    }
  }
  return { added, skipped };
}

/** Appends a reschedule note to a failed delivery and notifies the customer. */
export async function requestReschedule(orderId: string, identity: OrderIdentity, date: string): Promise<OrderDetail> {
  const order = await requireOwnedOrder(orderId, identity);
  if (order.status !== "failed_delivery") {
    throw new ApiError(409, "RESCHEDULE_NOT_ALLOWED", "Rescheduling is only available after a failed delivery attempt.");
  }
  if (!isValidRescheduleDate(date)) {
    throw new ApiError(422, "INVALID_DATE", "Please pick one of the offered dates.");
  }
  const label = formatShortDate(new Date(`${date}T12:00:00+05:30`));
  const { error } = await serviceClient().from("order_events").insert({ order_id: orderId, status: "failed_delivery" satisfies OrderStatus, note: `Reschedule requested for ${label}` });
  if (error) throwDb(error);
  if (order.userId) {
    await notifyUser({
      userId: order.userId,
      type: "order_shipped",
      title: "Delivery rescheduled",
      body: `We will attempt delivery of order ${order.orderNumber} on ${label}.`,
      href: `/orders/${orderId}`,
    }).catch(() => false);
  }
  return (await getOrder(orderId, identity)) ?? order;
}
