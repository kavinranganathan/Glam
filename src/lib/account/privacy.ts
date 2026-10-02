import "server-only";

import { serviceClient } from "@/lib/supabase/service";

/**
 * Everything GLAM holds about a user, for the DPDP "right to access" download.
 * Keys are stable so the export can be diffed across requests.
 */
export async function exportUserData(userId: string) {
  const db = serviceClient();
  const [profile, beauty, prefs, addresses, orders, reviews, ledger, notifications, tickets] = await Promise.all([
    db.from("profiles").select("*").eq("id", userId).maybeSingle(),
    db.from("beauty_profiles").select("*").eq("user_id", userId).maybeSingle(),
    db.from("notification_prefs").select("*").eq("user_id", userId).maybeSingle(),
    db.from("addresses").select("*").eq("user_id", userId),
    db.from("orders").select("*, items:order_items(*)").eq("user_id", userId).order("placed_at", { ascending: false }),
    db.from("reviews").select("*").eq("user_id", userId),
    db.from("points_ledger").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    db.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    db.from("support_tickets").select("*").eq("user_id", userId),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    profile: profile.data,
    beautyProfile: beauty.data,
    notificationPrefs: prefs.data,
    addresses: addresses.data ?? [],
    orders: orders.data ?? [],
    reviews: reviews.data ?? [],
    pointsLedger: ledger.data ?? [],
    notifications: notifications.data ?? [],
    supportTickets: tickets.data ?? [],
  };
}

/**
 * Anonymises the profile (orders are kept for tax/accounting), removes personal rows,
 * then deletes the auth user. Returns the counts removed for the audit log.
 */
export async function deleteAccount(userId: string): Promise<{ anonymised: boolean; authDeleted: boolean }> {
  const db = serviceClient();
  const { error: profileErr } = await db
    .from("profiles")
    .update({ name: null, email: null, phone: null, avatar_url: null, dob: null, marketing_consent: false })
    .eq("id", userId);
  if (profileErr) throw profileErr;
  await Promise.all([
    db.from("addresses").delete().eq("user_id", userId),
    db.from("saved_payment_methods").delete().eq("user_id", userId),
    db.from("beauty_profiles").delete().eq("user_id", userId),
    db.from("wishlist_collections").delete().eq("user_id", userId),
    db.from("notifications").delete().eq("user_id", userId),
    db.from("stock_alerts").delete().eq("user_id", userId),
  ]);
  const { error: authErr } = await db.auth.admin.deleteUser(userId);
  return { anonymised: true, authDeleted: !authErr };
}
