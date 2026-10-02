import "server-only";

import { ApiError } from "@/lib/api/respond";
import { serviceClient } from "@/lib/supabase/service";
import type { Enums, Tables } from "@/lib/supabase/types";
import type { OrderStatus } from "@/lib/orders/state-machine";
import { canTransition } from "@/lib/orders/state-machine";
import { simulationPlan, type SimulationStep } from "./rules";

export type PaymentStatus = Enums<"payment_status">;

export interface AdminOrderFilters {
  status?: OrderStatus;
  payment?: PaymentStatus;
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminOrderRow {
  id: string;
  orderNumber: string;
  placedAt: string;
  customerName: string | null;
  customerEmail: string | null;
  itemCount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
}

export interface AdminOrderList {
  rows: AdminOrderRow[];
  total: number;
  page: number;
  pageSize: number;
}

type ListRow = Tables<"orders"> & {
  order_items: Array<{ qty: number }>;
  profiles: { name: string | null; email: string | null } | null;
};

function toRow(o: ListRow): AdminOrderRow {
  return {
    id: o.id,
    orderNumber: o.order_number,
    placedAt: o.placed_at,
    customerName: o.profiles?.name ?? null,
    customerEmail: o.profiles?.email ?? o.guest_email ?? null,
    itemCount: o.order_items.reduce((n, i) => n + i.qty, 0),
    total: o.total,
    paymentMethod: o.payment_method,
    paymentStatus: o.payment_status,
    status: o.status,
  };
}

export async function listAdminOrders(filters: AdminOrderFilters = {}): Promise<AdminOrderList> {
  const db = serviceClient();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  let q = db
    .from("orders")
    .select("*, order_items(qty), profiles!orders_user_id_fkey(name, email)", { count: "exact" })
    .order("placed_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.payment) q = q.eq("payment_status", filters.payment);
  const term = filters.q?.trim();
  if (term) {
    const like = `%${term.replace(/[%_,()]/g, "")}%`;
    const { data: profiles } = await db.from("profiles").select("id").or(`email.ilike.${like},name.ilike.${like}`).limit(50);
    const ids = (profiles ?? []).map((p) => p.id);
    const parts = [`order_number.ilike.${like}`, `guest_email.ilike.${like}`];
    if (ids.length) parts.push(`user_id.in.(${ids.join(",")})`);
    q = q.or(parts.join(","));
  }
  const { data, error, count } = await q;
  if (error) throw error;
  return { rows: (data as ListRow[]).map(toRow), total: count ?? 0, page, pageSize };
}

export interface AdminOrderDetail {
  order: Tables<"orders">;
  customer: { id: string; name: string | null; email: string | null; phone: string | null } | null;
  items: Tables<"order_items">[];
  payments: Tables<"payments">[];
  events: Tables<"order_events">[];
  returns: Array<Pick<Tables<"returns">, "id" | "status" | "refund_amount" | "refund_method" | "created_at">>;
  simulationSteps: SimulationStep[];
}

export async function getAdminOrder(id: string): Promise<AdminOrderDetail> {
  const db = serviceClient();
  const { data: order, error } = await db.from("orders").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
  const [items, payments, events, returns, customer] = await Promise.all([
    db.from("order_items").select("*").eq("order_id", id).order("name"),
    db.from("payments").select("*").eq("order_id", id).order("created_at"),
    db.from("order_events").select("*").eq("order_id", id).order("created_at"),
    db.from("returns").select("id, status, refund_amount, refund_method, created_at").eq("order_id", id).order("created_at"),
    order.user_id ? db.from("profiles").select("id, name, email, phone").eq("id", order.user_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return {
    order,
    customer: customer.data ?? null,
    items: items.data ?? [],
    payments: payments.data ?? [],
    events: events.data ?? [],
    returns: returns.data ?? [],
    simulationSteps: simulationPlan(order.status),
  };
}

async function currentStatus(id: string): Promise<OrderStatus> {
  const { data, error } = await serviceClient().from("orders").select("status").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
  return data.status;
}

/** Advances one step via `advance_order` (validated client-side too so the UI can explain). */
export async function advanceOrder(id: string, status: OrderStatus, note?: string): Promise<AdminOrderDetail> {
  const from = await currentStatus(id);
  if (!canTransition(from, status)) {
    throw new ApiError(409, "TRANSITION_NOT_ALLOWED", `Cannot move an order from ${from} to ${status}.`);
  }
  const { error } = await serviceClient().rpc("advance_order", { p_order: id, p_status: status, p_note: note || undefined });
  if (error) throw error;
  return getAdminOrder(id);
}

export async function cancelOrder(id: string, reason: string): Promise<AdminOrderDetail> {
  return advanceOrder(id, "cancelled", reason);
}

/** Runs the remaining happy-path steps in one call. */
export async function simulateFulfilment(id: string): Promise<{ applied: SimulationStep[]; detail: AdminOrderDetail }> {
  const from = await currentStatus(id);
  const plan = simulationPlan(from);
  if (!plan.length) {
    throw new ApiError(409, "NOTHING_TO_SIMULATE", `Order is already ${from}; nothing left to simulate.`);
  }
  const applied: SimulationStep[] = [];
  for (const step of plan) {
    const { error } = await serviceClient().rpc("advance_order", { p_order: id, p_status: step.status, p_note: step.note });
    if (error) throw error;
    applied.push(step);
  }
  return { applied, detail: await getAdminOrder(id) };
}

/** Marks a pending payment as received (e.g. manual UPI reconciliation). */
export async function confirmOrderPayment(id: string): Promise<AdminOrderDetail> {
  const { data, error } = await serviceClient().from("orders").select("payment_status").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
  if (data.payment_status !== "pending") {
    throw new ApiError(409, "PAYMENT_NOT_PENDING", `Payment is already ${data.payment_status}.`);
  }
  const { error: rpcError } = await serviceClient().rpc("confirm_payment", { p_order: id, p_ref: `ADMIN-${Date.now()}` });
  if (rpcError) throw rpcError;
  return getAdminOrder(id);
}
