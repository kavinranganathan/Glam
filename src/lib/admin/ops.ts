import "server-only";

import { ApiError } from "@/lib/api/respond";
import { serviceClient } from "@/lib/supabase/service";
import type { Enums, Tables } from "@/lib/supabase/types";
import { listAdminOrders, type AdminOrderRow } from "./orders";
import { kpiWindow, LOW_STOCK_THRESHOLD, summariseOrders, type GmvOrder } from "./rules";

export interface KpiPeriod {
  orders: number;
  gmv: number;
  aov: number;
}

export interface Kpis {
  today: KpiPeriod;
  week: KpiPeriod;
  pendingReturns: number;
  openTickets: number;
  lowStock: number;
  outboxToday: number;
  recentOrders: AdminOrderRow[];
}

export async function getKpis(now: Date = new Date()): Promise<Kpis> {
  const db = serviceClient();
  const { todayStart, weekStart } = kpiWindow(now);
  const [orders, returns, tickets, lowStock, outbox, recent] = await Promise.all([
    db.from("orders").select("total, status, payment_status, placed_at").gte("placed_at", weekStart.toISOString()).limit(5000),
    db.from("returns").select("id", { count: "exact", head: true }).in("status", ["requested", "pickup_scheduled", "picked_up"]),
    db.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
    db.from("variants").select("id", { count: "exact", head: true }).lte("stock", LOW_STOCK_THRESHOLD),
    db.from("outbox").select("id", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
    listAdminOrders({ pageSize: 10 }),
  ]);
  if (orders.error) throw orders.error;
  const rows = orders.data as GmvOrder[];
  return {
    today: summariseOrders(rows, todayStart),
    week: summariseOrders(rows, weekStart),
    pendingReturns: returns.count ?? 0,
    openTickets: tickets.count ?? 0,
    lowStock: lowStock.count ?? 0,
    outboxToday: outbox.count ?? 0,
    recentOrders: recent.rows,
  };
}

export type OutboxChannel = Enums<"outbox_channel">;
export type OutboxRow = Tables<"outbox">;

export async function listOutbox(channel?: OutboxChannel, limit = 100): Promise<OutboxRow[]> {
  let q = serviceClient().from("outbox").select("*").order("created_at", { ascending: false }).limit(limit);
  if (channel) q = q.eq("channel", channel);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export type TicketStatus = Enums<"ticket_status">;
export interface TicketRow extends Tables<"support_tickets"> {
  profiles: { name: string | null; email: string | null } | null;
}

export async function listTickets(status?: TicketStatus, limit = 100): Promise<TicketRow[]> {
  let q = serviceClient().from("support_tickets").select("*, profiles!support_tickets_user_id_fkey(name, email)").order("created_at", { ascending: false }).limit(limit);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data as TicketRow[];
}

export async function updateTicket(id: string, status: TicketStatus): Promise<Tables<"support_tickets">> {
  const { data, error } = await serviceClient().from("support_tickets").update({ status }).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "NOT_FOUND", "Ticket not found.");
  return data;
}
