import "server-only";

import { serviceClient } from "@/lib/supabase/service";
import { mergeQuantities } from "./rules";
import { getOrCreateCart } from "./service";

/**
 * Folds a guest's session-scoped data into their account after login:
 *   - cart lines move into the user's cart (same variant: quantities summed, capped at 10;
 *     an active guest line un-saves a saved user line); the guest coupon is kept only if the
 *     user's cart has none; the guest cart row is then deleted
 *   - recently_viewed rows are re-keyed to the user (duplicates by product are dropped)
 *   - search_history rows are re-keyed to the user
 * Idempotent: a second call finds nothing keyed by the session id and is a no-op.
 */
export async function mergeGuestCart(sessionId: string, userId: string): Promise<void> {
  if (!sessionId || !userId) return;
  await Promise.all([mergeCartRows(sessionId, userId), mergeRecentlyViewed(sessionId, userId), mergeSearchHistory(sessionId, userId)]);
}

async function mergeCartRows(sessionId: string, userId: string): Promise<void> {
  const db = serviceClient();
  const { data: guest } = await db.from("carts").select("*").eq("session_id", sessionId).maybeSingle();
  if (!guest) return;

  const userCart = await getOrCreateCart({ user: { id: userId }, sessionId });
  if (userCart.id === guest.id) return; // defensive: same row (cannot happen with the check constraint, but cheap)

  const [{ data: guestItems }, { data: userItems }] = await Promise.all([
    db.from("cart_items").select("id, variant_id, qty, saved_for_later").eq("cart_id", guest.id),
    db.from("cart_items").select("id, variant_id, qty, saved_for_later").eq("cart_id", userCart.id),
  ]);
  const mine = new Map((userItems ?? []).map((i) => [i.variant_id, i]));

  for (const g of guestItems ?? []) {
    const existing = mine.get(g.variant_id);
    if (existing) {
      await db
        .from("cart_items")
        .update({ qty: mergeQuantities(existing.qty, g.qty), saved_for_later: existing.saved_for_later && g.saved_for_later })
        .eq("id", existing.id);
    } else {
      await db.from("cart_items").insert({ cart_id: userCart.id, variant_id: g.variant_id, qty: mergeQuantities(g.qty, 0), saved_for_later: g.saved_for_later });
    }
  }

  if (!userCart.coupon_code && guest.coupon_code) {
    await db.from("carts").update({ coupon_code: guest.coupon_code }).eq("id", userCart.id);
  }

  // Cascade removes the guest's cart_items.
  await db.from("carts").delete().eq("id", guest.id);
}

async function mergeRecentlyViewed(sessionId: string, userId: string): Promise<void> {
  const db = serviceClient();
  const { data: guestRows } = await db.from("recently_viewed").select("id, product_id, viewed_at").eq("session_id", sessionId);
  if (!guestRows || guestRows.length === 0) return;

  const { data: userRows } = await db.from("recently_viewed").select("id, product_id, viewed_at").eq("user_id", userId);
  const mine = new Map((userRows ?? []).map((r) => [r.product_id, r]));

  const dupIds: string[] = [];
  const moveIds: string[] = [];
  for (const g of guestRows) {
    const existing = mine.get(g.product_id);
    if (existing) {
      dupIds.push(g.id);
      if (new Date(g.viewed_at) > new Date(existing.viewed_at)) {
        await db.from("recently_viewed").update({ viewed_at: g.viewed_at }).eq("id", existing.id);
      }
    } else {
      moveIds.push(g.id);
      mine.set(g.product_id, g); // guards against duplicate guest rows for one product
    }
  }
  if (dupIds.length) await db.from("recently_viewed").delete().in("id", dupIds);
  if (moveIds.length) await db.from("recently_viewed").update({ user_id: userId, session_id: null }).in("id", moveIds);
}

async function mergeSearchHistory(sessionId: string, userId: string): Promise<void> {
  await serviceClient().from("search_history").update({ user_id: userId, session_id: null }).eq("session_id", sessionId);
}
