import "server-only";

import { ApiError } from "@/lib/api/respond";
import { getCategoryTree, listBrands } from "@/lib/catalogue/queries";
import type { CategoryNode } from "@/lib/catalogue/types";
import { serviceClient } from "@/lib/supabase/service";
import type { Tables } from "@/lib/supabase/types";
import { normaliseCouponCode } from "./rules";
import type { CouponInput } from "./schemas";

export type CouponRow = Tables<"coupons">;

/** Platform coupons only (personal / welcome coupons have a user_id). */
export async function listCoupons(): Promise<CouponRow[]> {
  const { data, error } = await serviceClient().from("coupons").select("*").is("user_id", null).order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

function validate(input: Partial<CouponInput>) {
  if (input.kind === "percent" && input.value !== undefined && input.value > 100) {
    throw new ApiError(422, "VALIDATION", "Percent coupons cannot exceed 100%.");
  }
  if (input.scope && input.scope !== "all" && !input.scope_id) {
    throw new ApiError(422, "VALIDATION", "Choose a brand or category for a scoped coupon.");
  }
  if (input.starts_at && input.ends_at && new Date(input.ends_at) <= new Date(input.starts_at)) {
    throw new ApiError(422, "VALIDATION", "Coupon must end after it starts.");
  }
}

export async function createCoupon(input: CouponInput): Promise<CouponRow> {
  validate(input);
  const row = { ...input, code: normaliseCouponCode(input.code), scope_id: input.scope === "all" ? null : input.scope_id ?? null };
  const { data, error } = await serviceClient().from("coupons").insert(row).select("*").single();
  if (error) {
    if (error.code === "23505") throw new ApiError(409, "DUPLICATE_CODE", "A coupon with that code already exists.");
    throw error;
  }
  return data;
}

export async function updateCoupon(id: string, patch: Partial<CouponInput>): Promise<CouponRow> {
  validate(patch);
  const row: Partial<CouponInput> = { ...patch };
  if (row.code) row.code = normaliseCouponCode(row.code);
  if (row.scope === "all") row.scope_id = null;
  const { data, error } = await serviceClient().from("coupons").update(row).eq("id", id).select("*").maybeSingle();
  if (error) {
    if (error.code === "23505") throw new ApiError(409, "DUPLICATE_CODE", "A coupon with that code already exists.");
    throw error;
  }
  if (!data) throw new ApiError(404, "NOT_FOUND", "Coupon not found.");
  return data;
}

export async function deleteCoupon(id: string): Promise<void> {
  const { error } = await serviceClient().from("coupons").delete().eq("id", id);
  if (error) throw error;
}

export interface ScopeOption {
  id: string;
  name: string;
}

function flatten(nodes: CategoryNode[], prefix = ""): ScopeOption[] {
  return nodes.flatMap((n) => {
    const name = prefix ? `${prefix} › ${n.name}` : n.name;
    return [{ id: n.id, name }, ...flatten(n.children, name)];
  });
}

/** Brand and category choices for the coupon scope picker. */
export async function listScopeOptions(): Promise<{ brands: ScopeOption[]; categories: ScopeOption[] }> {
  const [brands, tree] = await Promise.all([listBrands(), getCategoryTree()]);
  return { brands: brands.map((b) => ({ id: b.id, name: b.name })), categories: flatten(tree) };
}
