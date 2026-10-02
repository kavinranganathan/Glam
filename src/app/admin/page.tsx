import Link from "next/link";
import { KpiTiles } from "@/components/admin/kpi-tiles";
import { OrdersTable } from "@/components/admin/orders-table";
import { PageHeader } from "@/components/admin/data-table";
import { requireAdminPage } from "@/lib/admin/guard";
import { LOW_STOCK_THRESHOLD } from "@/lib/admin/rules";
import { getKpis } from "@/lib/admin/service";
import { formatINR } from "@/lib/utils/money";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdminPage("/admin");
  const k = await getKpis();
  const money = (p: number) => formatINR(p);
  return (
    <>
      <PageHeader title="Dashboard" description="Today and the last 7 days (IST). GMV counts paid / COD-confirmed orders that are not cancelled." />
      <section aria-labelledby="today" className="mb-6">
        <h2 id="today" className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-tertiary">
          Today
        </h2>
        <KpiTiles
          tiles={[
            { label: "Orders", value: String(k.today.orders), href: "/admin/orders" },
            { label: "GMV", value: money(k.today.gmv) },
            { label: "AOV", value: money(k.today.aov) },
            { label: "Outbox sends", value: String(k.outboxToday), hint: "SMS / email / push today", href: "/admin/outbox" },
          ]}
        />
      </section>
      <section aria-labelledby="week" className="mb-6">
        <h2 id="week" className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-tertiary">
          Last 7 days
        </h2>
        <KpiTiles
          tiles={[
            { label: "Orders", value: String(k.week.orders), href: "/admin/orders" },
            { label: "GMV", value: money(k.week.gmv) },
            { label: "AOV", value: money(k.week.aov) },
            { label: "Pending returns", value: String(k.pendingReturns), tone: k.pendingReturns ? "warning" : "neutral", href: "/admin/returns" },
          ]}
        />
      </section>
      <section aria-labelledby="ops" className="mb-6">
        <h2 id="ops" className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-tertiary">
          Operations
        </h2>
        <KpiTiles
          tiles={[
            { label: "Open tickets", value: String(k.openTickets), tone: k.openTickets ? "warning" : "neutral", href: "/admin/tickets" },
            { label: "Low-stock variants", value: String(k.lowStock), hint: `stock ≤ ${LOW_STOCK_THRESHOLD}`, tone: k.lowStock ? "warning" : "neutral", href: "/admin/catalogue?low=1" },
          ]}
        />
      </section>
      <section aria-labelledby="recent">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="recent" className="text-sm font-semibold uppercase tracking-wide text-text-tertiary">
            Recent orders
          </h2>
          <Link href="/admin/orders" className="text-sm font-semibold text-primary">
            All orders
          </Link>
        </div>
        <OrdersTable rows={k.recentOrders} empty="No orders yet. Place one from the storefront to see it here." />
      </section>
    </>
  );
}
