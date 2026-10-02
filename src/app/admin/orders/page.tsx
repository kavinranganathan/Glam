import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrdersTable } from "@/components/admin/orders-table";
import { PageHeader } from "@/components/admin/data-table";
import { requireAdminPage } from "@/lib/admin/guard";
import { listAdminOrders, type PaymentStatus } from "@/lib/admin/service";
import { ALL_STATUSES, STATUS_LABEL, type OrderStatus } from "@/lib/orders/state-machine";

export const dynamic = "force-dynamic";

const PAYMENTS: PaymentStatus[] = ["pending", "paid", "cod_pending", "failed", "refunded"];
const selectCls = "h-11 rounded-input border border-border bg-background px-3 text-sm";

type Search = { status?: string; payment?: string; q?: string; page?: string };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdminPage("/admin/orders");
  const sp = await searchParams;
  const status = ALL_STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : undefined;
  const payment = PAYMENTS.includes(sp.payment as PaymentStatus) ? (sp.payment as PaymentStatus) : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const list = await listAdminOrders({ status, payment, q: sp.q, page, pageSize: 25 });
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (status) u.set("status", status);
    if (payment) u.set("payment", payment);
    if (sp.q) u.set("q", sp.q);
    u.set("page", String(p));
    return `/admin/orders?${u}`;
  };

  return (
    <>
      <PageHeader title="Orders" description={`${list.total} order${list.total === 1 ? "" : "s"} match.`} />
      <form method="get" className="mb-4 flex flex-wrap items-end gap-2" role="search" aria-label="Filter orders">
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Status
          <select name="status" defaultValue={status ?? ""} className={selectCls}>
            <option value="">All statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-secondary">
          Payment
          <select name="payment" defaultValue={payment ?? ""} className={selectCls}>
            <option value="">All payments</option>
            {PAYMENTS.map((p) => (
              <option key={p} value={p}>
                {p.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs font-medium text-text-secondary">
          Search
          <input name="q" defaultValue={sp.q ?? ""} placeholder="Order number, email or name" className="h-11 rounded-input border border-border bg-background px-3 text-sm" />
        </label>
        <Button type="submit" size="md">
          Filter
        </Button>
        {(status || payment || sp.q) && (
          <Button href="/admin/orders" variant="ghost" size="md">
            Clear
          </Button>
        )}
      </form>
      {(status || payment) && (
        <p className="mb-2 flex gap-1 text-xs text-text-tertiary">
          Showing {status && <Badge>{STATUS_LABEL[status]}</Badge>} {payment && <Badge>{payment}</Badge>}
        </p>
      )}
      <OrdersTable rows={list.rows} empty="No orders match these filters." />
      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-3 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={qs(page - 1)} className="font-semibold text-primary">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-text-tertiary">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={qs(page + 1)} className="font-semibold text-primary">
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
