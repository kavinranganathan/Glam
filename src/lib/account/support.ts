import "server-only";

import { z } from "zod";
import { serviceClient } from "@/lib/supabase/service";
import type { Tables } from "@/lib/supabase/types";
import { CALLBACK_SLOTS, CALLBACK_SLOT_LABEL } from "./support-constants";

export { CALLBACK_SLOTS, CALLBACK_SLOT_LABEL } from "./support-constants";
export type { CallbackSlot } from "./support-constants";

export type Ticket = Tables<"support_tickets">;

export const TicketSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("ticket"),
    subject: z.string().trim().min(3).max(120),
    message: z.string().trim().min(10).max(2000),
    email: z.email().optional(),
  }),
  z.object({
    kind: z.literal("callback"),
    phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number"),
    slot: z.enum(CALLBACK_SLOTS),
    email: z.email().optional(),
    message: z.string().trim().max(500).optional(),
  }),
]);
export type TicketInput = z.infer<typeof TicketSchema>;

/** Creates a support ticket or callback request. Guests may submit with an email so we can reply. */
export async function createTicket(userId: string | null, input: TicketInput): Promise<Ticket> {
  const db = serviceClient();
  const contact = input.email ? `\n\nContact: ${input.email}` : "";
  const row =
    input.kind === "ticket"
      ? { subject: input.subject, body: `${input.message}${contact}`, kind: "ticket" }
      : {
          subject: `Callback request · ${CALLBACK_SLOT_LABEL[input.slot]}`,
          body: `Phone: ${input.phone}\nPreferred slot: ${CALLBACK_SLOT_LABEL[input.slot]}${input.message ? `\n\n${input.message}` : ""}${contact}`,
          kind: "callback",
        };
  const { data, error } = await db
    .from("support_tickets")
    .insert({ user_id: userId, ...row })
    .select("*")
    .single();
  if (error) throw error;
  if (userId) {
    await db.from("notifications").insert({
      user_id: userId,
      type: "support",
      title: input.kind === "ticket" ? "We received your ticket" : "Callback requested",
      body: input.kind === "ticket" ? `"${input.subject}" — our team replies within 24 hours.` : `We will call ${input.phone} during ${CALLBACK_SLOT_LABEL[input.slot]}.`,
      href: "/help",
    });
  }
  return data;
}

export async function listTickets(userId: string): Promise<Ticket[]> {
  const { data, error } = await serviceClient()
    .from("support_tickets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}
