import "server-only";

import { serviceClient } from "@/lib/supabase/service";
import { getProductsByIds, normaliseQuery } from "./queries";
import type { ProductCard } from "./types";

type Viewer = { id: string } | null;

/**
 * recently_viewed / search_history are keyed by user id for signed-in users and by the guest
 * session id otherwise. The unique indexes are partial, which PostgREST upserts cannot target,
 * so writes are delete-then-insert.
 */
function ownerFilter<Q extends { eq: (col: string, v: string) => Q }>(q: Q, user: Viewer, sessionId: string): Q {
  return user ? q.eq("user_id", user.id) : q.eq("session_id", sessionId);
}

function ownerColumns(user: Viewer, sessionId: string): { user_id: string | null; session_id: string | null } {
  return user ? { user_id: user.id, session_id: null } : { user_id: null, session_id: sessionId };
}

export async function recordView(productId: string, user: Viewer, sessionId: string): Promise<void> {
  const sb = serviceClient();
  const del = ownerFilter(sb.from("recently_viewed").delete(), user, sessionId).eq("product_id", productId);
  const { error: delError } = await del;
  if (delError) throw delError;
  const { error } = await sb
    .from("recently_viewed")
    .insert({ ...ownerColumns(user, sessionId), product_id: productId, viewed_at: new Date().toISOString() });
  if (error) throw error;
}

export async function getRecentlyViewed(user: Viewer, sessionId: string, limit = 10): Promise<ProductCard[]> {
  const q = ownerFilter(serviceClient().from("recently_viewed").select("product_id,viewed_at"), user, sessionId)
    .order("viewed_at", { ascending: false })
    .limit(limit * 2);
  const { data, error } = await q;
  if (error) throw error;
  const ids = [...new Set(data.map((r) => r.product_id))].slice(0, limit);
  return getProductsByIds(ids);
}

export async function recordSearch(query: string, user: Viewer, sessionId: string): Promise<void> {
  const q = normaliseQuery(query);
  if (q.length < 2) return;
  const { error } = await serviceClient()
    .from("search_history")
    .insert({ ...ownerColumns(user, sessionId), query: q.slice(0, 120) });
  if (error) throw error;
}

/** Distinct (case-insensitive) recent queries, newest first. */
export async function getRecentSearches(user: Viewer, sessionId: string, limit = 8): Promise<string[]> {
  const q = ownerFilter(serviceClient().from("search_history").select("query,created_at"), user, sessionId)
    .order("created_at", { ascending: false })
    .limit(Math.max(50, limit * 5));
  const { data, error } = await q;
  if (error) throw error;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of data) {
    const key = r.query.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r.query);
    if (out.length >= limit) break;
  }
  return out;
}

export async function clearRecentSearches(user: Viewer, sessionId: string): Promise<void> {
  const { error } = await ownerFilter(serviceClient().from("search_history").delete(), user, sessionId);
  if (error) throw error;
}

export async function removeRecentSearch(query: string, user: Viewer, sessionId: string): Promise<void> {
  const q = normaliseQuery(query);
  if (!q) return;
  const { error } = await ownerFilter(serviceClient().from("search_history").delete(), user, sessionId).ilike(
    "query",
    q.replace(/[%_\\]/g, (m) => `\\${m}`),
  );
  if (error) throw error;
}
