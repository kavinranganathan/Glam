import { z } from "zod";
import { ApiError, handle, ok } from "@/lib/api/respond";
import { requireUser } from "@/lib/auth/session";
import { serviceClient } from "@/lib/supabase/service";

type Ctx = { params: Promise<{ id: string }> };

async function resolveBrand(id: string): Promise<{ id: string; follower_count: number }> {
  if (!z.uuid().safeParse(id).success) throw new ApiError(404, "BRAND_NOT_FOUND", "Brand not found.");
  const { data, error } = await serviceClient().from("brands").select("id,follower_count").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "BRAND_NOT_FOUND", "Brand not found.");
  return data;
}

async function setFollowerCount(brandId: string, next: number): Promise<number> {
  const value = Math.max(0, next);
  const { error } = await serviceClient().from("brands").update({ follower_count: value }).eq("id", brandId);
  if (error) throw error;
  return value;
}

/** POST /api/brands/[id]/follow -> { following: true, followerCount }. Idempotent. */
export const POST = handle(async (_req, ctx: Ctx) => {
  const { id } = await ctx.params;
  const user = await requireUser();
  const brand = await resolveBrand(id);
  const { error } = await serviceClient().from("brand_follows").insert({ user_id: user.id, brand_id: brand.id });
  if (error && error.code !== "23505") throw error; // 23505 = already following
  const followerCount = error ? brand.follower_count : await setFollowerCount(brand.id, brand.follower_count + 1);
  return ok({ following: true, followerCount });
});

/** DELETE /api/brands/[id]/follow -> { following: false, followerCount }. Idempotent. */
export const DELETE = handle(async (_req, ctx: Ctx) => {
  const { id } = await ctx.params;
  const user = await requireUser();
  const brand = await resolveBrand(id);
  const { data, error } = await serviceClient()
    .from("brand_follows")
    .delete()
    .eq("user_id", user.id)
    .eq("brand_id", brand.id)
    .select("brand_id");
  if (error) throw error;
  const removed = (data?.length ?? 0) > 0;
  const followerCount = removed ? await setFollowerCount(brand.id, brand.follower_count - 1) : brand.follower_count;
  return ok({ following: false, followerCount });
});
