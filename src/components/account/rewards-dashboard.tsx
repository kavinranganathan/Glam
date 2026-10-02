import { Check, Clock, Crown, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TIER_BENEFITS, TIER_LABEL, TIER_ORDER, TIER_THRESHOLDS, pointsMultiplier } from "@/lib/loyalty/tiers";
import { REFERRAL_POINTS, REVIEW_POINTS_WITHOUT_PHOTO, REVIEW_POINTS_WITH_PHOTO } from "@/lib/loyalty/points";
import type { RewardsSummary } from "@/lib/loyalty/service";
import { formatINR } from "@/lib/utils/money";
import { formatShortDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

/** S37 header: balance, tier progress, all-tier benefits, expiring points, how to earn. */
export function RewardsDashboard({ summary }: { summary: RewardsSummary }) {
  const pct = Math.round(summary.progress * 100);
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-card bg-gradient-to-br from-primary to-secondary p-5 text-white shadow-sm" aria-labelledby="points-balance">
        <p id="points-balance" className="text-sm/5 opacity-90">
          Points balance
        </p>
        <p className="font-display text-4xl font-bold">{summary.pointsBalance.toLocaleString("en-IN")}</p>
        <p className="text-sm opacity-90">Worth {formatINR(summary.pointsValuePaise)} at checkout · 1 point = ₹0.25</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge tone="dark" className="bg-white/20 text-white">
            <Crown className="h-3.5 w-3.5" aria-hidden /> {TIER_LABEL[summary.tier]} · {pointsMultiplier(summary.tier)}× points
          </Badge>
          {summary.isPro && (
            <Badge tone="dark" className="bg-white/20 text-white">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> GLAM Pro
            </Badge>
          )}
        </div>
      </section>

      <section className="rounded-card border border-border p-4" aria-labelledby="tier-progress">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="tier-progress" className="font-display text-lg font-semibold">
            Your tier
          </h2>
          <span className="text-sm text-text-tertiary">12-month spend {formatINR(summary.spend12m)}</span>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={summary.nextTier ? `Progress to ${TIER_LABEL[summary.nextTier.tier]}` : "Platinum reached"}
          className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-surface"
        >
          <div className="h-full rounded-full bg-primary motion-safe:transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-sm text-text-secondary">
          {summary.nextTier
            ? `Spend ${formatINR(summary.nextTier.remaining)} more to reach ${TIER_LABEL[summary.nextTier.tier]} (${formatINR(TIER_THRESHOLDS[summary.nextTier.tier])} in 12 months).`
            : "You are at Platinum, our highest tier. Thank you!"}
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {TIER_ORDER.map((t) => {
            const current = t === summary.tier;
            return (
              <li key={t} className={cn("rounded-card border p-3", current ? "border-primary bg-primary-soft" : "border-border")} aria-current={current ? "true" : undefined}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text">{TIER_LABEL[t]}</span>
                  <span className="text-xs text-text-tertiary">{t === "base" ? "Everyone" : `${formatINR(TIER_THRESHOLDS[t])}+`}</span>
                </div>
                <ul className="mt-1.5 space-y-1 text-xs text-text-secondary">
                  {TIER_BENEFITS[t].map((b) => (
                    <li key={b} className="flex gap-1.5">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                      {b}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </section>

      {summary.expiringSoon.length > 0 && (
        <section className="rounded-card border border-warning/40 bg-warning-soft p-4" aria-labelledby="expiring">
          <h2 id="expiring" className="flex items-center gap-2 font-display text-base font-semibold text-warning">
            <Clock className="h-4 w-4" aria-hidden /> Points expiring soon
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-text-secondary">
            {summary.expiringSoon.slice(0, 5).map((r) => (
              <li key={r.id} className="flex justify-between">
                <span>{r.delta.toLocaleString("en-IN")} pts · {r.reason}</span>
                <span>expires {formatShortDate(r.expires_at as string)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-text-tertiary">Points last 12 months from the day you earn them. Use them in your bag before they lapse.</p>
        </section>
      )}

      <section className="rounded-card border border-border p-4" aria-labelledby="how-to-earn">
        <h2 id="how-to-earn" className="font-display text-lg font-semibold">
          How to earn
        </h2>
        <ul className="mt-2 space-y-2 text-sm text-text-secondary">
          <li>
            <strong className="text-text">Shop:</strong> 1 point per ₹10 on products, × {pointsMultiplier(summary.tier)} at your tier. Not earned on delivery, taxes, COD fee or the part paid with points.
          </li>
          <li>
            <strong className="text-text">Review:</strong> {REVIEW_POINTS_WITH_PHOTO} points with a photo, {REVIEW_POINTS_WITHOUT_PHOTO} without, on verified purchases.
          </li>
          <li>
            <strong className="text-text">Refer:</strong> {REFERRAL_POINTS} points when a friend&apos;s first order is ₹500 or more.
          </li>
          <li>
            <strong className="text-text">Birthday:</strong> a treat lands in your coupons each year — add your date of birth in Edit Profile.
          </li>
        </ul>
      </section>
    </div>
  );
}
