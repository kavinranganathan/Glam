import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RewardsDashboard } from "@/components/account/rewards-dashboard";
import { PointsHistory } from "@/components/account/points-history";
import { ReferralCard } from "@/components/account/referral-card";
import { getUser } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { getPointsHistory, getRewardsSummary } from "@/lib/loyalty/service";

export const metadata: Metadata = { title: "GLAM Rewards" };

/** S37 GLAM Rewards dashboard. */
export default async function RewardsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getUser();
  if (!user) redirect("/login?next=/profile/rewards");
  const sp = await searchParams;
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : "1") || 1);
  const [summary, history] = await Promise.all([getRewardsSummary(user.id), getPointsHistory(user.id, page)]);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-text">GLAM Rewards</h1>
      <RewardsDashboard summary={summary} />
      <ReferralCard code={summary.referralCode} siteUrl={env.siteUrl} />
      <PointsHistory history={history} />
    </div>
  );
}
