import "server-only";

import { ApiError } from "@/lib/api/respond";
import { serviceClient } from "@/lib/supabase/service";
import type { Tables } from "@/lib/supabase/types";
import { canAdvanceReturn, nextReturnStatusesFor, type ReturnStatus } from "./rules";

export interface AdminReturnRow {
  id: string;
  createdAt: string;
  status: ReturnStatus;
  reason: string;
  refundMethod: "original" | "wallet";
  refundAmount: number;
  orderId: string;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  itemCount: number;
}

type ListRow = Tables<"returns"> & {
  orders: { order_number: string } | null;
  profiles: { name: string | null; email: string | null } | null;
  return_items: Array<{ qty: number }>;
};

export async function listAdminReturns(status?: ReturnStatus, limit = 100): Promise<AdminReturnRow[]> {
  let q = serviceClient()
    .from("returns")
    .select("*, orders(order_number), profiles!returns_user_id_fkey(name, email), return_items(qty)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data as ListRow[]).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    status: r.status,
    reason: r.reason,
    refundMethod: r.refund_method,
    refundAmount: r.refund_amount,
    orderId: r.order_id,
    orderNumber: r.orders?.order_number ?? "—",
    customerName: r.profiles?.name ?? null,
    customerEmail: r.profiles?.email ?? null,
    itemCount: r.return_items.reduce((n, i) => n + i.qty, 0),
  }));
}

export interface AdminReturnDetail {
  ret: Tables<"returns">;
  order: Pick<Tables<"orders">, "id" | "order_number" | "status" | "payment_method" | "total" | "delivered_at"> | null;
  customer: { name: string | null; email: string | null; phone: string | null } | null;
  items: Array<{ id: string; qty: number; item: Tables<"order_items"> | null }>;
  events: Tables<"return_events">[];
  nextStatuses: ReturnStatus[];
}

export async function getAdminReturn(id: string): Promise<AdminReturnDetail> {
  const db = serviceClient();
  const { data: ret, error } = await db.from("returns").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!ret) throw new ApiError(404, "RETURN_NOT_FOUND", "Return not found.");
  const [order, customer, items, events] = await Promise.all([
    db.from("orders").select("id, order_number, status, payment_method, total, delivered_at").eq("id", ret.order_id).maybeSingle(),
    ret.user_id ? db.from("profiles").select("name, email, phone").eq("id", ret.user_id).maybeSingle() : Promise.resolve({ data: null }),
    db.from("return_items").select("id, qty, order_items(*)").eq("return_id", id),
    db.from("return_events").select("*").eq("return_id", id).order("created_at"),
  ]);
  return {
    ret,
    order: order.data ?? null,
    customer: customer.data ?? null,
    items: (items.data ?? []).map((ri) => ({
      id: ri.id,
      qty: ri.qty,
      item: (ri.order_items as unknown as Tables<"order_items"> | null) ?? null,
    })),
    events: events.data ?? [],
    nextStatuses: nextReturnStatusesFor(ret.status),
  };
}

export async function advanceReturn(id: string, status: ReturnStatus, note?: string): Promise<AdminReturnDetail> {
  const { data, error } = await serviceClient().from("returns").select("status").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "RETURN_NOT_FOUND", "Return not found.");
  if (!canAdvanceReturn(data.status, status)) {
    throw new ApiError(409, "TRANSITION_NOT_ALLOWED", `Cannot move a return from ${data.status} to ${status}.`);
  }
  const { error: rpcError } = await serviceClient().rpc("advance_return", { p_return: id, p_status: status, p_note: note || undefined });
  if (rpcError) throw rpcError;
  return getAdminReturn(id);
}
