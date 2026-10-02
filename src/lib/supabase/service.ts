import "server-only";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "./types";

let client: SupabaseClient<Database> | null = null;

/**
 * Service-role client. Bypasses RLS. Server-only: use for privileged writes
 * (order placement, stock, loyalty, admin, guest carts keyed by session id).
 */
export function serviceClient(): SupabaseClient<Database> {
  if (!client) {
    client = createSupabaseClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
