import "server-only";

import { serviceClient } from "@/lib/supabase/service";
import { mergeGuestCart } from "@/lib/cart/merge";

export const REF_COOKIE = "glam_ref";

/**
 * Steps shared by the magic-link callback and the OTP verify route after a session exists:
 * merge the guest cart, attach a referral, and decide where to send the user.
 */
export async function completeLogin(opts: { userId: string; sessionId: string | null; refCode: string | null; next: string | null }) {
  const db = serviceClient();
  if (opts.sessionId) {
    try {
      await mergeGuestCart(opts.sessionId, opts.userId);
    } catch (e) {
      console.error("[auth] guest cart merge failed", e);
    }
  }
  if (opts.refCode) {
    try {
      const { data: me } = await db.from("profiles").select("id, referred_by, created_at").eq("id", opts.userId).single();
      if (me && !me.referred_by) {
        const { data: referrer } = await db.from("profiles").select("id").eq("referral_code", opts.refCode.toUpperCase()).maybeSingle();
        if (referrer && referrer.id !== opts.userId) {
          await db.from("profiles").update({ referred_by: referrer.id }).eq("id", opts.userId);
        }
      }
    } catch (e) {
      console.error("[auth] referral attach failed", e);
    }
  }
  const { data: bp } = await db.from("beauty_profiles").select("user_id").eq("user_id", opts.userId).maybeSingle();
  const safeNext = opts.next && opts.next.startsWith("/") && !opts.next.startsWith("//") ? opts.next : null;
  if (!bp) return `/profile/beauty?welcome=1${safeNext ? `&next=${encodeURIComponent(safeNext)}` : ""}`;
  return safeNext ?? "/";
}
