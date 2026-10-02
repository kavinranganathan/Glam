import Link from "next/link";
import { Coins, Package, Wallet } from "lucide-react";
import { formatINR } from "@/lib/utils/money";
import { pointsValue } from "@/lib/loyalty/points";

/** S35 stat tiles: points → rewards, wallet balance, orders → orders list. */
export function StatTiles({ points, wallet, orders }: { points: number; wallet: number; orders: number }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Tile href="/profile/rewards" label="Points" value={points.toLocaleString("en-IN")} sub={`worth ${formatINR(pointsValue(points))}`} Icon={Coins} />
      <Tile label="Wallet" value={formatINR(wallet)} sub="GLAM credit" Icon={Wallet} />
      <Tile href="/orders" label="Orders" value={String(orders)} sub={orders === 1 ? "order placed" : "orders placed"} Icon={Package} />
    </div>
  );
}

function Tile({
  href,
  label,
  value,
  sub,
  Icon,
}: {
  href?: string;
  label: string;
  value: string;
  sub: string;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}) {
  const inner = (
    <>
      <Icon className="h-5 w-5 text-primary" aria-hidden />
      <span className="mt-2 block text-xs font-medium uppercase tracking-wide text-text-tertiary">{label}</span>
      <span className="block font-display text-lg font-bold text-text">{value}</span>
      <span className="block truncate text-xs text-text-tertiary">{sub}</span>
    </>
  );
  const cls = "flex min-h-[7rem] flex-col rounded-card border border-border bg-background p-3";
  if (href) {
    return (
      <Link href={href} className={`${cls} hover:border-primary focus-visible:border-primary`} aria-label={`${label}: ${value}`}>
        {inner}
      </Link>
    );
  }
  return <div className={cls}>{inner}</div>;
}
