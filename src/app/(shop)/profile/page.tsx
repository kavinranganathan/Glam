import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Crown, Pencil, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProfileMenu } from "@/components/account/profile-menu";
import { StatTiles } from "@/components/account/stat-tiles";
import { getUser } from "@/lib/auth/session";
import { getSpend12m } from "@/lib/loyalty/service";
import { TIER_LABEL, tierForSpend } from "@/lib/loyalty/tiers";
import { serviceClient } from "@/lib/supabase/service";
import { formatShortDate } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "My Profile" };

/** S35 My Profile hub. */
export default async function ProfilePage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/profile");
  const [spend12m, orders] = await Promise.all([
    getSpend12m(user.id, user.lifetime_spend),
    serviceClient().from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  const tier = tierForSpend(spend12m);
  const displayName = user.name?.trim() || "GLAM Member";
  const email = user.email ?? user.authEmail ?? "";
  const initial = (displayName[0] ?? "G").toUpperCase();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6">
      <header className="flex items-center gap-4">
        {user.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar_url} alt="" className="h-16 w-16 rounded-full border border-border object-cover" />
        ) : (
          <span aria-hidden className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-2xl font-bold text-primary">
            {initial}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="truncate font-display text-xl font-bold text-text">{displayName}</h1>
          <p className="truncate text-sm text-text-secondary">{email}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge tone="primary">
              <Crown className="h-3 w-3" aria-hidden /> {TIER_LABEL[tier]}
            </Badge>
            {user.isPro ? (
              <Badge tone="secondary">
                <Sparkles className="h-3 w-3" aria-hidden /> Pro till {formatShortDate(user.pro_until as string)}
              </Badge>
            ) : (
              <Link href="/pro" className="inline-flex items-center rounded-pill border border-secondary px-2 text-xs font-semibold text-secondary">
                Try GLAM Pro
              </Link>
            )}
          </div>
        </div>
        <Link href="/profile/edit" className="inline-flex h-11 items-center gap-1 rounded-pill border border-border px-4 text-sm font-semibold text-text hover:bg-surface" aria-label="Edit profile">
          <Pencil className="h-4 w-4" aria-hidden /> Edit
        </Link>
      </header>

      <StatTiles points={user.points_balance} wallet={user.wallet_balance} orders={orders.count ?? 0} />

      <ProfileMenu isAdmin={user.role === "admin"} />
    </div>
  );
}
