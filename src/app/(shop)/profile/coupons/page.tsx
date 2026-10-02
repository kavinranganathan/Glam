import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CouponGrid, OfferTypes, loadCoupons } from "@/components/account/coupons-section";
import { getUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My Coupons" };

/** Signed-in coupons view: active (expiring soon first) plus redeemed history. */
export default async function MyCouponsPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/profile/coupons");
  const { active, redeemed } = await loadCoupons(user.id);
  const expiring = active.filter((c) => c.expiringSoon);
  const rest = active.filter((c) => !c.expiringSoon);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Coupons &amp; offers</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Personal and public coupons you can use right now. See every running promotion on the{" "}
          <Link href="/offers" className="font-semibold text-primary">
            Offers page
          </Link>
          .
        </p>
      </div>

      {expiring.length > 0 && (
        <section aria-labelledby="my-expiring">
          <h2 id="my-expiring" className="mb-2 font-display text-lg font-semibold text-warning">
            Expiring soon
          </h2>
          <CouponGrid coupons={expiring} emptyTitle="" />
        </section>
      )}

      <section aria-labelledby="my-active">
        <h2 id="my-active" className="mb-2 font-display text-lg font-semibold text-text">
          Active coupons
        </h2>
        <CouponGrid coupons={rest} emptyTitle={expiring.length ? "No other coupons right now" : "No active coupons"} />
      </section>

      {redeemed.length > 0 && (
        <section aria-labelledby="my-redeemed">
          <h2 id="my-redeemed" className="mb-2 font-display text-lg font-semibold text-text">
            Redeemed
          </h2>
          <CouponGrid coupons={redeemed} emptyTitle="" canApply={false} />
        </section>
      )}

      <OfferTypes />
    </div>
  );
}
