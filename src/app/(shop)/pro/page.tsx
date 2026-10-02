import type { Metadata } from "next";
import { Check, PartyPopper, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProBenefitsTable } from "@/components/account/pro-benefits";
import { ProJoinButton } from "@/components/account/pro-join";
import { getUser } from "@/lib/auth/session";
import { PRO_BENEFITS, PRO_PRICE_PAISE } from "@/lib/account/pro";
import { getSpend12m } from "@/lib/loyalty/service";
import { tierForSpend } from "@/lib/loyalty/tiers";
import { proDaysLeft } from "@/lib/loyalty/rules";
import { formatShortDate } from "@/lib/utils/dates";
import { formatINR } from "@/lib/utils/money";

export const metadata: Metadata = { title: "GLAM Pro" };

/** S44 GLAM Pro subscription page. Public; subscribe requires login. */
export default async function ProPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [sp, user] = await Promise.all([searchParams, getUser().catch(() => null)]);
  const welcome = sp.welcome === "1";
  const tier = user ? tierForSpend(await getSpend12m(user.id, user.lifetime_spend)) : null;
  const isPro = Boolean(user?.isPro);
  const daysLeft = proDaysLeft(user?.pro_until ?? null);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-6">
      <section
        className={`relative overflow-hidden rounded-card p-6 text-white ${welcome ? "bg-gradient-to-br from-secondary via-primary to-warning" : "bg-gradient-to-br from-secondary to-primary"}`}
        aria-labelledby="pro-hero"
      >
        {welcome && (
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-70 motion-reduce:hidden" style={{ backgroundImage: "radial-gradient(circle at 10% 20%, rgba(255,255,255,.5) 0 3px, transparent 4px), radial-gradient(circle at 70% 30%, rgba(255,255,255,.5) 0 2px, transparent 3px), radial-gradient(circle at 40% 80%, rgba(255,255,255,.5) 0 3px, transparent 4px), radial-gradient(circle at 90% 70%, rgba(255,255,255,.5) 0 2px, transparent 3px)", backgroundSize: "120px 120px" }} />
        )}
        <div className="relative">
          <Badge tone="dark" className="bg-white/20 text-white">
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> GLAM Pro
          </Badge>
          <h1 id="pro-hero" className="mt-3 font-display text-3xl font-bold">
            {welcome ? (
              <span className="flex items-center gap-2">
                <PartyPopper className="h-7 w-7" aria-hidden /> Welcome to Pro!
              </span>
            ) : isPro ? (
              "You're a Pro member"
            ) : (
              "Free delivery, early access, Pro prices"
            )}
          </h1>
          <p className="mt-2 max-w-md text-sm/6 opacity-95">
            {isPro && user?.pro_until
              ? `Member until ${formatShortDate(user.pro_until)} (${daysLeft} day${daysLeft === 1 ? "" : "s"} left). Extend any time — months stack.`
              : `${formatINR(PRO_PRICE_PAISE)} a month. Pays for itself in two orders. Cancel any time by simply not renewing.`}
          </p>
          <div className="mt-5 max-w-sm">
            <ProJoinButton isLoggedIn={Boolean(user)} isPro={isPro} />
          </div>
        </div>
      </section>

      <section aria-labelledby="benefits">
        <h2 id="benefits" className="font-display text-xl font-bold text-text">
          What you get
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {PRO_BENEFITS.map((b) => (
            <li key={b.title} className="flex gap-3 rounded-card border border-border p-4">
              <span className="mt-0.5 rounded-full bg-secondary-soft p-1.5 text-secondary">
                <Check className="h-4 w-4" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold text-text">{b.title}</span>
                <span className="block text-sm text-text-secondary">{b.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="compare">
        <h2 id="compare" className="font-display text-xl font-bold text-text">
          Pro vs loyalty tiers
        </h2>
        <p className="mt-1 mb-3 text-sm text-text-secondary">Tiers are earned by spending; Pro is a paid membership that stacks on top of whichever tier you hold.</p>
        <ProBenefitsTable currentTier={tier} />
      </section>

      <section className="rounded-card bg-surface p-4 text-sm text-text-secondary" aria-labelledby="fine-print">
        <h2 id="fine-print" className="font-semibold text-text">
          The fine print
        </h2>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>₹299 per month, inclusive of GST. Each purchase adds one month to your membership end date.</li>
          <li>No auto-renewal in this build — you choose when to extend.</li>
          <li>Pro prices and coupons apply only while the membership is active.</li>
        </ul>
      </section>
    </div>
  );
}
