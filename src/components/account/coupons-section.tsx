import { Ticket } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { CouponCard, type CouponView } from "@/components/account/coupon-card";
import { couponExpiringSoon } from "@/lib/loyalty/rules";
import { describeCoupon } from "@/lib/pricing/coupons";
import type { CouponRecord } from "@/lib/pricing/types";
import { serviceClient } from "@/lib/supabase/service";

type CouponRow = CouponRecord & { id: string };

/** Active public coupons (user_id null) plus the signed-in user's personal coupons; expiring soon first. */
export async function loadCoupons(userId: string | null): Promise<{ active: CouponView[]; redeemed: CouponView[] }> {
  const db = serviceClient();
  const nowIso = new Date().toISOString();
  let q = db.from("coupons").select("*").eq("is_active", true).lte("starts_at", nowIso).or(`ends_at.is.null,ends_at.gte.${nowIso}`);
  q = userId ? q.or(`user_id.is.null,user_id.eq.${userId}`) : q.is("user_id", null);
  const { data, error } = await q.order("ends_at", { ascending: true, nullsFirst: false });
  if (error) throw error;
  const rows = (data ?? []) as CouponRow[];

  const redemptions = new Map<string, string>();
  if (userId) {
    const { data: red } = await db.from("coupon_redemptions").select("coupon_id, created_at, coupon:coupons(code)").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
    for (const r of (red ?? []) as unknown as Array<{ coupon_id: string; created_at: string; coupon: { code: string } | null }>) {
      if (!redemptions.has(r.coupon_id)) redemptions.set(r.coupon_id, r.created_at);
    }
  }

  const toView = (c: CouponRow): CouponView => ({
    code: c.code,
    description: describeCoupon(c),
    minOrder: c.min_order,
    endsAt: c.ends_at,
    proOnly: c.pro_only,
    personal: c.user_id !== null,
    expiringSoon: couponExpiringSoon(c.ends_at),
  });

  const active: CouponView[] = [];
  const redeemed: CouponView[] = [];
  for (const c of rows) {
    const usedAt = redemptions.get(c.id);
    if (usedAt && c.per_user_limit <= 1) redeemed.push({ ...toView(c), redeemedAt: usedAt });
    else active.push(toView(c));
  }
  active.sort((a, b) => Number(b.expiringSoon) - Number(a.expiringSoon) || Number(b.personal) - Number(a.personal));
  return { active, redeemed };
}

export function CouponGrid({ coupons, emptyTitle, canApply = true }: { coupons: CouponView[]; emptyTitle: string; canApply?: boolean }) {
  if (coupons.length === 0) {
    return <EmptyState icon={<Ticket className="h-7 w-7" aria-hidden />} title={emptyTitle} description="Complete your beauty profile to unlock a welcome coupon, and check back during sales." action={{ label: "Beauty profile", href: "/profile/beauty" }} secondary={{ label: "Flash sale", href: "/flash-sale" }} />;
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {coupons.map((c) => (
        <li key={c.code}>
          <CouponCard coupon={c} canApply={canApply} />
        </li>
      ))}
    </ul>
  );
}

const OFFER_TYPES = [
  { title: "Coupon codes", text: "Percentage or flat discounts with a minimum order. Apply in your bag; one coupon per order." },
  { title: "Buy X Get Y", text: "Brand-funded offers like Buy 2 Get 1 — the cheapest item is free, applied automatically in your bag." },
  { title: "Flash sales", text: "Time-boxed deep discounts with a countdown. Flash prices override Pro prices while the sale runs." },
  { title: "GLAM Pro exclusive", text: "Lower Pro prices and Pro-only codes for members. Join from the Pro page for ₹299/month." },
];

export function OfferTypes() {
  return (
    <section aria-labelledby="offer-types" className="rounded-card bg-surface p-4">
      <h2 id="offer-types" className="font-display text-base font-semibold text-text">
        How offers work
      </h2>
      <dl className="mt-2 grid gap-3 sm:grid-cols-2">
        {OFFER_TYPES.map((o) => (
          <div key={o.title}>
            <dt className="text-sm font-semibold text-text">{o.title}</dt>
            <dd className="text-sm text-text-secondary">{o.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
