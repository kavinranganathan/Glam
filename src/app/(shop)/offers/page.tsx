import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Zap } from "lucide-react";
import { CouponGrid, OfferTypes, loadCoupons } from "@/components/account/coupons-section";
import { getUser } from "@/lib/auth/session";
import { getActiveFlashSale } from "@/lib/catalogue/queries";

export const metadata: Metadata = { title: "Offers & Coupons" };

/** S38 Offers & Coupons — public; personal coupons appear when signed in. */
export default async function OffersPage() {
  const user = await getUser().catch(() => null);
  const [{ active }, flash] = await Promise.all([loadCoupons(user?.id ?? null), getActiveFlashSale().catch(() => null)]);
  const expiring = active.filter((c) => c.expiringSoon);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Offers &amp; Coupons</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {user ? "Public offers plus coupons just for you." : "Sign in to see personal coupons and apply codes with one tap."}
          {!user && (
            <>
              {" "}
              <Link href="/login?next=/offers" className="font-semibold text-primary">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {flash && (
          <Link href="/flash-sale" className="flex items-center gap-3 rounded-card bg-gradient-to-r from-primary to-secondary p-4 text-white">
            <Zap className="h-6 w-6" aria-hidden />
            <span>
              <span className="block font-display font-bold">{flash.name} is live</span>
              <span className="block text-sm opacity-90">Flash prices on {flash.prices.size} products →</span>
            </span>
          </Link>
        )}
        {!user?.isPro && (
          <Link href="/pro" className="flex items-center gap-3 rounded-card border border-secondary bg-secondary-soft p-4 text-secondary">
            <Sparkles className="h-6 w-6" aria-hidden />
            <span>
              <span className="block font-display font-bold">GLAM Pro exclusives</span>
              <span className="block text-sm">Pro prices and members-only codes for ₹299/month →</span>
            </span>
          </Link>
        )}
      </div>

      {expiring.length > 0 && (
        <section aria-labelledby="expiring-soon">
          <h2 id="expiring-soon" className="mb-2 font-display text-lg font-semibold text-warning">
            Expiring soon
          </h2>
          <CouponGrid coupons={expiring} emptyTitle="" />
        </section>
      )}

      <section aria-labelledby="all-coupons">
        <h2 id="all-coupons" className="mb-2 font-display text-lg font-semibold text-text">
          {expiring.length > 0 ? "All coupons" : "Coupons"}
        </h2>
        <CouponGrid coupons={active.filter((c) => !c.expiringSoon)} emptyTitle={expiring.length ? "No other coupons right now" : "No coupons right now"} />
      </section>

      <OfferTypes />
    </div>
  );
}
