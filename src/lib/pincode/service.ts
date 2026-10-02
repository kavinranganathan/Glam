import "server-only";

import { availableSlots, estimatedDelivery } from "@/lib/pricing/delivery";
import type { PincodeRecord } from "@/lib/pricing/types";
import { serviceClient } from "@/lib/supabase/service";

export interface PincodeQuote {
  serviceable: boolean;
  pincode: string;
  city: string;
  state: string;
  sameDay: boolean;
  nextDay: boolean;
  codAvailable: boolean;
  courier: string;
  /** Standard-slot delivery fee in paise before free-delivery rules. */
  fee: number;
  standardDays: number;
  /** ISO timestamps per slot; faster slots are present only when available right now. */
  estimates: { standard: string; next_day?: string; same_day?: string };
  /** The pincode supports same-day, but the 12 PM IST cut-off has passed for today. */
  sameDayCutoffPassed: boolean;
}

export async function lookupPincode(pincode: string): Promise<PincodeRecord | null> {
  if (!/^\d{6}$/.test(pincode)) return null;
  const { data } = await serviceClient().from("pincodes").select("*").eq("pincode", pincode).maybeSingle();
  return data;
}

/** Serviceability + slot estimates for a pincode; null when we do not deliver there. */
export async function pincodeQuote(pincode: string, now: Date = new Date()): Promise<PincodeQuote | null> {
  const rec = await lookupPincode(pincode);
  if (!rec) return null;
  const slots = availableSlots(rec, now);
  const estimates: PincodeQuote["estimates"] = { standard: estimatedDelivery("standard", rec, now).toISOString() };
  if (slots.includes("next_day")) estimates.next_day = estimatedDelivery("next_day", rec, now).toISOString();
  if (slots.includes("same_day")) estimates.same_day = estimatedDelivery("same_day", rec, now).toISOString();
  return {
    serviceable: true,
    pincode: rec.pincode,
    city: rec.city,
    state: rec.state,
    sameDay: rec.same_day,
    nextDay: rec.next_day,
    codAvailable: rec.cod_available,
    courier: rec.courier,
    fee: rec.delivery_fee,
    standardDays: rec.standard_days,
    estimates,
    sameDayCutoffPassed: rec.same_day && !slots.includes("same_day"),
  };
}
