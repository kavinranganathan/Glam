import "server-only";

import { serviceClient } from "@/lib/supabase/service";
import type { Enums } from "@/lib/supabase/types";

export type NotificationType = Enums<"notification_type">;
export type Channel = Enums<"outbox_channel">;

/** Marketing types gated by notification preferences (PRD §8.12). Transactional types always send. */
const PREF_KEY: Partial<Record<NotificationType, "orders" | "offers" | "reviews" | "loyalty" | "personalised">> = {
  flash_sale: "offers",
  abandoned_cart: "offers",
  browse_abandonment: "personalised",
  weekly_digest: "personalised",
  review_prompt: "reviews",
  coupon: "offers",
  brand_launch: "personalised",
  price_drop: "offers",
};

const QUIET_START = 22; // 10 PM IST
const QUIET_END = 8; // 8 AM IST

export function inQuietHours(now: Date = new Date()): boolean {
  const h = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(now));
  return h >= QUIET_START || h < QUIET_END;
}

/**
 * Creates an in-app notification and records the outbound sends in `outbox` (simulated SMS/email/push).
 * Marketing types respect `notification_prefs` and quiet hours (push suppressed 10 PM–8 AM IST).
 */
export async function notifyUser(opts: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string | null;
  channels?: Channel[];
}): Promise<boolean> {
  const db = serviceClient();
  const prefKey = PREF_KEY[opts.type];
  if (prefKey) {
    const { data: prefs } = await db.from("notification_prefs").select("*").eq("user_id", opts.userId).maybeSingle();
    if (prefs && prefs[prefKey] === false) return false;
  }
  const { error } = await db.from("notifications").insert({
    user_id: opts.userId,
    type: opts.type,
    title: opts.title,
    body: opts.body,
    href: opts.href ?? null,
  });
  if (error) throw error;

  const { data: profile } = await db.from("profiles").select("email, phone").eq("id", opts.userId).maybeSingle();
  const recipient = profile?.email ?? profile?.phone ?? opts.userId;
  const channels = (opts.channels ?? ["push"]).filter((c) => !(prefKey && c === "push" && inQuietHours()));
  if (channels.length) {
    await db.from("outbox").insert(
      channels.map((channel) => ({
        channel,
        recipient,
        subject: opts.title,
        body: opts.body,
        payload: { type: opts.type, href: opts.href ?? null, user_id: opts.userId },
      })),
    );
  }
  return true;
}

export async function markRead(userId: string, ids: string[] | "all"): Promise<void> {
  const db = serviceClient();
  let q = db.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
  if (ids !== "all") q = q.in("id", ids);
  const { error } = await q;
  if (error) throw error;
}

export async function listNotifications(userId: string, limit = 100) {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await serviceClient()
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

/** Fires back-in-stock notifications for variants that were restocked. Called after admin stock updates. */
export async function notifyBackInStock(variantId: string): Promise<number> {
  const db = serviceClient();
  const { data: alerts } = await db.from("stock_alerts").select("id, user_id").eq("variant_id", variantId).is("notified_at", null);
  if (!alerts?.length) return 0;
  const { data: v } = await db.from("variants").select("name, products(name, slug)").eq("id", variantId).single();
  const product = (v as unknown as { name: string; products: { name: string; slug: string } | null } | null)?.products;
  for (const a of alerts) {
    await notifyUser({
      userId: a.user_id,
      type: "back_in_stock",
      title: "Back in stock!",
      body: `${product?.name ?? "An item you wanted"} is available again. Grab it before it sells out.`,
      href: product ? `/p/${product.slug}` : "/wishlist",
    });
  }
  await db.from("stock_alerts").update({ notified_at: new Date().toISOString() }).in("id", alerts.map((a) => a.id));
  return alerts.length;
}

/** Price-drop alerts for wishlisted items whose price fell ≥10% since they were added. */
export async function notifyPriceDrops(productId: string): Promise<number> {
  const db = serviceClient();
  const { data: product } = await db.from("products").select("name, slug, price").eq("id", productId).single();
  if (!product) return 0;
  const { data: items } = await db
    .from("wishlist_items")
    .select("id, price_at_add, wishlist_collections!inner(user_id)")
    .eq("product_id", productId);
  let n = 0;
  for (const it of items ?? []) {
    if (product.price <= it.price_at_add * 0.9) {
      const owner = (it as unknown as { wishlist_collections: { user_id: string } }).wishlist_collections.user_id;
      const sent = await notifyUser({
        userId: owner,
        type: "price_drop",
        title: "Price drop on your wishlist",
        body: `${product.name} is now ₹${product.price / 100}. You saved it at ₹${it.price_at_add / 100}.`,
        href: `/p/${product.slug}`,
      });
      if (sent) n++;
    }
  }
  return n;
}
