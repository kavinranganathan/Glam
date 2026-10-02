import type { Metadata } from "next";
import { Zap } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductGrid } from "@/components/product/shelf";
import { FlashCountdown } from "@/components/account/flash-countdown";
import { FlashNotifyToggle } from "@/components/account/flash-notify-toggle";
import { getUser } from "@/lib/auth/session";
import { getFlashSaleView, listProducts } from "@/lib/catalogue/queries";
import { serviceClient } from "@/lib/supabase/service";
import { formatDateTime } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Flash Sale" };

/** S39 Flash Sale landing: hero + countdown + flash-priced grid, or an empty state with best sellers. */
export default async function FlashSalePage() {
  const [user, sale] = await Promise.all([getUser().catch(() => null), getFlashSaleView().catch(() => null)]);
  const prefs = user ? await serviceClient().from("notification_prefs").select("offers").eq("user_id", user.id).maybeSingle() : null;
  const notifyOn = prefs?.data?.offers ?? true;

  if (!sale) {
    const best = await listProducts({ sort: "popularity", pageSize: 8 }).catch(() => null);
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
        <EmptyState
          icon={<Zap className="h-7 w-7" aria-hidden />}
          title="No flash sale right now"
          description="Flash sales drop a few times a month with deep, time-boxed discounts. Turn on alerts and we'll ping you 30 minutes before the next one."
          action={{ label: "Browse offers", href: "/offers" }}
          secondary={{ label: "Explore", href: "/explore" }}
          className="py-10"
        />
        <div className="mx-auto w-full max-w-md">
          <FlashNotifyToggle initial={Boolean(user) && notifyOn} isLoggedIn={Boolean(user)} />
        </div>
        {best && best.items.length > 0 && (
          <section aria-labelledby="best-sellers">
            <h2 id="best-sellers" className="mb-3 font-display text-xl font-bold text-text">
              Best sellers meanwhile
            </h2>
            <ProductGrid items={best.items} shelfKey="flash-fallback" />
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
      <section
        className="relative overflow-hidden rounded-card bg-gradient-to-br from-primary via-primary to-secondary p-6 text-white"
        style={sale.bannerUrl ? { backgroundImage: `linear-gradient(to right, rgba(219,39,119,.92), rgba(124,58,237,.85)), url(${sale.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        aria-labelledby="flash-hero"
      >
        <p className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide opacity-90">
          <Zap className="h-4 w-4" aria-hidden /> Flash sale · live now
        </p>
        <h1 id="flash-hero" className="mt-1 font-display text-3xl font-bold">
          {sale.name}
        </h1>
        <p className="mt-1 text-sm opacity-90">
          {sale.items.length} products · ends {formatDateTime(sale.endsAt)}
        </p>
        <div className="mt-4">
          <FlashCountdown endsAt={sale.endsAt} />
        </div>
      </section>

      <div className="max-w-md">
        <FlashNotifyToggle initial={Boolean(user) && notifyOn} isLoggedIn={Boolean(user)} />
      </div>

      <section aria-labelledby="flash-products">
        <h2 id="flash-products" className="mb-3 font-display text-xl font-bold text-text">
          Flash prices
        </h2>
        {sale.items.length === 0 ? (
          <EmptyState title="Everything sold out" description="This sale's products are gone — the next drop is coming." action={{ label: "Browse offers", href: "/offers" }} />
        ) : (
          <ProductGrid items={sale.items} shelfKey="flash-sale" />
        )}
      </section>
    </div>
  );
}
