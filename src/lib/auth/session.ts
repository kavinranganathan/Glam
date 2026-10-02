import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { ApiError } from "@/lib/api/respond";
import type { Tables } from "@/lib/supabase/types";

export type Profile = Tables<"profiles"> & { isPro: boolean; authEmail: string | null };

/** Current user's profile, or null for guests. Memoised per request. */
export const getUser = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await serviceClient().from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) {
    // Trigger should have created it; recover gracefully for users created before migrations ran.
    const { data: created } = await serviceClient()
      .from("profiles")
      .upsert({ id: user.id, email: user.email ?? null, name: user.user_metadata?.name ?? null })
      .select("*")
      .single();
    if (!created) return null;
    return decorate(created, user.email ?? null);
  }
  return decorate(profile, user.email ?? null);
});

function decorate(p: Tables<"profiles">, authEmail: string | null): Profile {
  return {
    ...p,
    authEmail,
    isPro: Boolean(p.pro_until && new Date(p.pro_until) > new Date()),
  };
}

export async function requireUser(): Promise<Profile> {
  const user = await getUser();
  if (!user) throw new ApiError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  return user;
}

export async function requireAdmin(): Promise<Profile> {
  const user = await requireUser();
  if (user.role !== "admin") throw new ApiError(403, "FORBIDDEN", "Admin access required.");
  return user;
}

export function isPro(profile: { pro_until: string | null } | null | undefined): boolean {
  return Boolean(profile?.pro_until && new Date(profile.pro_until) > new Date());
}
