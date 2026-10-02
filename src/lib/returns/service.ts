import "server-only";

import { ApiError } from "@/lib/api/respond";
import { getOrder, isUuid, throwDb } from "@/lib/orders/queries";
import type { OrderAddress, OrderDetail, OrderIdentity, ReturnDetail, ReturnPayloadInput, ReturnSummary, ReturnableItemState } from "@/lib/orders/views";
import { serviceClient } from "@/lib/supabase/service";
import type { Json, Tables } from "@/lib/supabase/types.generated";
import { refundEta } from "./policy";
import { returnableItemState, validateReturnPayload } from "./rules";

/** Eligibility per order item (window, non-returnable flag, remaining quantity). */
export function getReturnableItems(order: OrderDetail, now: Date = new Date()): ReturnableItemState[] {
  return order.items.map((item) =>
    returnableItemState(
      { id: item.id, qty: item.qty, returnedQty: item.returnedQty, nonReturnable: item.nonReturnable, returnWindowDays: item.returnWindowDays },
      order.status === "delivered" ? order.deliveredAt : null,
      now,
    ),
  );
}

/** Validates and creates a return via `create_return`; returns the new return id. */
export async function createReturn(orderId: string, identity: OrderIdentity, payload: ReturnPayloadInput): Promise<{ returnId: string }> {
  if (!identity.user) throw new ApiError(401, "UNAUTHENTICATED", "Please sign in to request a return.");
  const order = await getOrder(orderId, identity);
  if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");

  const result = validateReturnPayload(payload, {
    status: order.status,
    deliveredAt: order.deliveredAt,
    items: order.items.map((i) => ({ id: i.id, qty: i.qty, returnedQty: i.returnedQty, nonReturnable: i.nonReturnable, returnWindowDays: i.returnWindowDays })),
  });
  if (!result.ok) {
    const status = result.code === "QTY_EXCEEDS" ? 400 : result.code === "ITEM_NOT_FOUND" ? 404 : result.code.endsWith("_ALLOWED") || result.code === "RETURN_WINDOW_CLOSED" || result.code === "NON_RETURNABLE" ? 409 : 422;
    throw new ApiError(status, result.code, result.message);
  }
  const p = result.payload;
  const rpcPayload: Json = {
    items: p.items.map((l) => ({ order_item_id: l.order_item_id, qty: l.qty })),
    reason: p.reason,
    comment: p.comment,
    refund_method: p.refund_method,
    photos: p.photos,
    ...(p.pickup_address ? { pickup_address: p.pickup_address as unknown as Json } : {}),
  };
  const { data, error } = await serviceClient().rpc("create_return", { p_order: orderId, p_user: identity.user.id, p_payload: rpcPayload });
  if (error) throwDb(error);
  return { returnId: data };
}

type ReturnRow = Tables<"returns"> & {
  orders: Pick<Tables<"orders">, "order_number" | "user_id" | "session_id" | "payment_method"> | null;
};

const RETURN_SELECT = "*, orders(order_number, user_id, session_id, payment_method)" as const;

export async function getReturn(returnId: string, identity: OrderIdentity): Promise<ReturnDetail | null> {
  if (!isUuid(returnId)) return null;
  const db = serviceClient();
  const { data, error } = await db.from("returns").select(RETURN_SELECT).eq("id", returnId).maybeSingle();
  if (error) throwDb(error);
  const row = data as unknown as ReturnRow | null;
  if (!row || !row.orders) return null;
  const ownedByUser = identity.user && (row.user_id === identity.user.id || row.orders.user_id === identity.user.id);
  const ownedBySession = !identity.user && identity.sessionId && row.orders.session_id === identity.sessionId;
  if (!ownedByUser && !ownedBySession) return null;

  const [itemsRes, eventsRes] = await Promise.all([
    db.from("return_items").select("qty, order_item_id, order_items(name, brand_name, image, variant_name)").eq("return_id", returnId),
    db.from("return_events").select("status, note, created_at").eq("return_id", returnId).order("created_at", { ascending: true }),
  ]);
  if (itemsRes.error) throwDb(itemsRes.error);
  if (eventsRes.error) throwDb(eventsRes.error);

  type ItemRow = { qty: number; order_item_id: string; order_items: Pick<Tables<"order_items">, "name" | "brand_name" | "image" | "variant_name"> | null };
  const items = (itemsRes.data as unknown as ItemRow[]).map((r) => ({
    orderItemId: r.order_item_id,
    name: r.order_items?.name ?? "Item",
    brandName: r.order_items?.brand_name ?? "",
    image: r.order_items?.image ?? null,
    qty: r.qty,
    variantName: r.order_items?.variant_name ?? "",
  }));

  return {
    id: row.id,
    orderId: row.order_id,
    orderNumber: row.orders.order_number,
    status: row.status,
    reason: row.reason,
    comment: row.comment,
    refundMethod: row.refund_method,
    photos: row.photos,
    awb: row.awb,
    refundAmount: row.refund_amount,
    pickupAddress: (row.pickup_address ?? {}) as OrderAddress,
    pickupScheduledFor: row.pickup_scheduled_for,
    refundedAt: row.refunded_at,
    createdAt: row.created_at,
    items,
    events: eventsRes.data.map((e) => ({ status: e.status, note: e.note, at: e.created_at })),
    refundEta: refundEta(row.refund_method, row.orders.payment_method),
  };
}

export async function listReturns(userId: string): Promise<ReturnSummary[]> {
  const { data, error } = await serviceClient()
    .from("returns")
    .select("id, order_id, status, refund_amount, created_at, orders(order_number), return_items(qty, order_items(image))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throwDb(error);
  type Row = {
    id: string;
    order_id: string;
    status: ReturnSummary["status"];
    refund_amount: number;
    created_at: string;
    orders: { order_number: string } | null;
    return_items: Array<{ qty: number; order_items: { image: string | null } | null }>;
  };
  return (data as unknown as Row[]).map((r) => ({
    id: r.id,
    orderId: r.order_id,
    orderNumber: r.orders?.order_number ?? "",
    status: r.status,
    refundAmount: r.refund_amount,
    createdAt: r.created_at,
    itemCount: r.return_items.reduce((n, i) => n + i.qty, 0),
    firstImage: r.return_items.find((i) => i.order_items?.image)?.order_items?.image ?? null,
  }));
}
