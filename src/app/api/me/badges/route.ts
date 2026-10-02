import { handle, ok } from "@/lib/api/respond";
import { getGuestSessionId } from "@/lib/auth/guest";
import { getUser } from "@/lib/auth/session";
import { getCartCount } from "@/lib/cart/service";
import { serviceClient } from "@/lib/supabase/service";

/** Counts for the app bar / bottom nav. Guests only have a bag count. */
export const GET = handle(async () => {
  const [user, sessionId] = await Promise.all([getUser(), getGuestSessionId()]);
  const identity = { user: user ? { id: user.id } : null, sessionId };
  if (!user) {
    return ok({ cartCount: await getCartCount(identity), wishlistCount: 0, unreadNotifications: 0, isLoggedIn: false });
  }
  const db = serviceClient();
  const [cartCount, wishlist, unread] = await Promise.all([
    getCartCount(identity),
    db.from("wishlist_items").select("id, wishlist_collections!inner(user_id)", { count: "exact", head: true }).eq("wishlist_collections.user_id", user.id),
    db.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
  ]);
  return ok({ cartCount, wishlistCount: wishlist.count ?? 0, unreadNotifications: unread.count ?? 0, isLoggedIn: true });
});
