import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Package, Search } from "lucide-react";
import { OrderCard } from "@/components/orders/order-card";
import { EmptyState } from "@/components/ui/empty-state";
import { getUser } from "@/lib/auth/session";
import { listOrders } from "@/lib/orders/queries";
import type { OrderFilter } from "@/lib/orders/views";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "My Orders" };

const FILTERS: Array<{ value: OrderFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "returns", label: "Returns" },
];

const PAGE_SIZE = 10;

function href(status: OrderFilter, q: string, page: number): string {
  const sp = new URLSearchParams();
  if (status !== "all") sp.set("status", status);
  if (q) sp.set("q", q);
  if (page > 1) sp.set("page", String(page));
  const s = sp.toString();
  return s ? `/orders?${s}` : "/orders";
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getUser();
  if (!user) redirect("/login?next=/orders");
  const sp = await searchParams;
  const status = (FILTERS.some((f) => f.value === sp.status) ? sp.status : "all") as OrderFilter;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 40) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const { items, total } = await listOrders(user.id, { status, q, page, pageSize: PAGE_SIZE });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = status !== "all" || q.length > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-text">My Orders</h1>

      <form action="/orders" method="get" role="search" className="mt-4">
        {status !== "all" && <input type="hidden" name="status" value={status} />}
        <label htmlFor="order-search" className="sr-only">
          Search by order number
        </label>
        <div className="flex h-11 items-center gap-2 rounded-input border border-border bg-background px-3 focus-within:ring-2 focus-within:ring-primary/40">
          <Search className="h-4 w-4 text-text-tertiary" aria-hidden />
          <input id="order-search" name="q" defaultValue={q} placeholder="Search by order number (e.g. GLM-2026-…)" className="flex-1 min-w-0 bg-transparent text-base outline-none placeholder:text-text-tertiary" />
          {q && (
            <Link href={href(status, "", 1)} className="text-sm font-semibold text-primary">
              Clear
            </Link>
          )}
        </div>
      </form>

      <nav aria-label="Filter orders" className="mt-3 flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {FILTERS.map((f) => {
          const active = f.value === status;
          return (
            <Link
              key={f.value}
              href={href(f.value, q, 1)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-10 shrink-0 items-center rounded-pill border px-4 text-sm font-medium transition-colors",
                active ? "border-primary bg-primary-soft text-primary" : "border-border bg-background text-text-secondary hover:border-text-tertiary",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {items.length === 0 ? (
        filtered ? (
          <EmptyState icon={<Package className="h-7 w-7" aria-hidden />} title="No matching orders" description="Try a different filter or order number." action={{ label: "Show all orders", href: "/orders" }} />
        ) : (
          <EmptyState icon={<Package className="h-7 w-7" aria-hidden />} title="No orders yet" description="Your orders and returns will show up here." action={{ label: "Start shopping", href: "/" }} />
        )
      ) : (
        <>
          <p className="mt-4 text-sm text-text-tertiary">
            {total} order{total === 1 ? "" : "s"}
          </p>
          <ul className="mt-2 flex flex-col gap-3">
            {items.map((o) => (
              <li key={o.id}>
                <OrderCard order={o} />
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-6 flex items-center justify-between">
              <Link
                href={href(status, q, page - 1)}
                aria-disabled={page <= 1}
                className={cn("btn inline-flex min-h-11 items-center gap-1 text-sm font-semibold", page <= 1 ? "pointer-events-none text-text-tertiary" : "text-primary")}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden /> Newer
              </Link>
              <span className="text-sm text-text-secondary">
                Page {page} of {pages}
              </span>
              <Link
                href={href(status, q, page + 1)}
                aria-disabled={page >= pages}
                className={cn("btn inline-flex min-h-11 items-center gap-1 text-sm font-semibold", page >= pages ? "pointer-events-none text-text-tertiary" : "text-primary")}
              >
                Older <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
