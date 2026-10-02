import "server-only";

import { ApiError } from "@/lib/api/respond";
import { serviceClient } from "@/lib/supabase/service";
import type { Updates } from "@/lib/supabase/types";
import { type Address, type AddressInput, toAddress } from "./address";

const UNAVAILABLE = () => new ApiError(500, "ADDRESS_UNAVAILABLE", "Could not save your address. Please try again.");

/** Default first, then oldest first. */
export async function listAddresses(userId: string): Promise<Address[]> {
  const { data, error } = await serviceClient()
    .from("addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw UNAVAILABLE();
  return (data ?? []).map(toAddress);
}

export async function getAddress(userId: string, id: string): Promise<Address | null> {
  const { data } = await serviceClient().from("addresses").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  return data ? toAddress(data) : null;
}

/** The first address a user saves becomes the default; `isDefault` moves the flag off the others. */
export async function createAddress(userId: string, input: AddressInput): Promise<Address> {
  const db = serviceClient();
  const { count } = await db.from("addresses").select("id", { count: "exact", head: true }).eq("user_id", userId);
  const makeDefault = (count ?? 0) === 0 || Boolean(input.isDefault);
  if (makeDefault) await db.from("addresses").update({ is_default: false }).eq("user_id", userId);
  const { data, error } = await db
    .from("addresses")
    .insert({
      user_id: userId,
      label: input.label,
      name: input.name,
      phone: input.phone,
      line1: input.line1,
      line2: input.line2 ?? null,
      landmark: input.landmark ?? null,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      is_default: makeDefault,
    })
    .select("*")
    .single();
  if (error || !data) throw UNAVAILABLE();
  return toAddress(data);
}

export async function updateAddress(userId: string, id: string, patch: Partial<AddressInput>): Promise<Address> {
  const db = serviceClient();
  const existing = await getAddress(userId, id);
  if (!existing) throw new ApiError(404, "ADDRESS_NOT_FOUND", "Address not found.");
  if (patch.isDefault) await db.from("addresses").update({ is_default: false }).eq("user_id", userId).neq("id", id);
  const update = { ...columns(patch), ...(patch.isDefault !== undefined ? { is_default: patch.isDefault || existing.isDefault } : {}) };
  const { data, error } = await db.from("addresses").update(update).eq("id", id).eq("user_id", userId).select("*").single();
  if (error || !data) throw UNAVAILABLE();
  return toAddress(data);
}

/** Deleting the default promotes the oldest remaining address. */
export async function deleteAddress(userId: string, id: string): Promise<void> {
  const db = serviceClient();
  const existing = await getAddress(userId, id);
  if (!existing) throw new ApiError(404, "ADDRESS_NOT_FOUND", "Address not found.");
  const { error } = await db.from("addresses").delete().eq("id", id).eq("user_id", userId);
  if (error) throw UNAVAILABLE();
  if (existing.isDefault) {
    const { data: next } = await db.from("addresses").select("id").eq("user_id", userId).order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (next) await db.from("addresses").update({ is_default: true }).eq("id", next.id);
  }
}

function columns(a: Partial<AddressInput>): Partial<Updates<"addresses">> {
  const out: Partial<Updates<"addresses">> = {};
  if (a.label !== undefined) out.label = a.label;
  if (a.name !== undefined) out.name = a.name;
  if (a.phone !== undefined) out.phone = a.phone;
  if (a.line1 !== undefined) out.line1 = a.line1;
  if (a.line2 !== undefined) out.line2 = a.line2 ?? null;
  if (a.landmark !== undefined) out.landmark = a.landmark ?? null;
  if (a.city !== undefined) out.city = a.city;
  if (a.state !== undefined) out.state = a.state;
  if (a.pincode !== undefined) out.pincode = a.pincode;
  return out;
}
