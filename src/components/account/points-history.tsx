import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { PointsHistoryPage } from "@/lib/loyalty/service";
import { formatDateTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

/** S37 ledger list: reason, ± delta, date, balance after. Paginated via ?page=. */
export function PointsHistory({ history }: { history: PointsHistoryPage }) {
  return (
    <section className="rounded-card border border-border" aria-labelledby="points-history">
      <h2 id="points-history" className="px-4 pt-4 font-display text-lg font-semibold">
        Points history
      </h2>
      {history.rows.length === 0 ? (
        <EmptyState title="No points activity yet" description="Place an order or write a review to start earning." action={{ label: "Start shopping", href: "/explore" }} className="py-8" />
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {history.rows.map((r) => {
            const earn = r.delta > 0;
            return (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span className={cn("rounded-full p-2", earn ? "bg-success-soft text-success" : "bg-error-soft text-error")}>
                  {earn ? <ArrowDownLeft className="h-4 w-4" aria-hidden /> : <ArrowUpRight className="h-4 w-4" aria-hidden />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-sm font-medium text-text">{r.reason}</span>
                  <span className="block text-xs text-text-tertiary">{formatDateTime(r.created_at)}</span>
                </span>
                <span className="text-right">
                  <span className={cn("block text-sm font-semibold", earn ? "text-success" : "text-error")}>
                    {earn ? "+" : "−"}
                    {Math.abs(r.delta).toLocaleString("en-IN")}
                  </span>
                  <span className="block text-xs text-text-tertiary">bal {r.balance_after.toLocaleString("en-IN")}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {(history.page > 1 || history.hasMore) && (
        <nav className="flex justify-between border-t border-border px-4 py-3 text-sm font-semibold" aria-label="History pages">
          {history.page > 1 ? (
            <Link href={`/profile/rewards?page=${history.page - 1}`} className="text-primary">
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          {history.hasMore && (
            <Link href={`/profile/rewards?page=${history.page + 1}`} className="text-primary">
              Older →
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
