import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataTable, PageHeader, type Column } from "@/components/admin/data-table";
import { requireAdminPage } from "@/lib/admin/guard";
import type { ReturnStatus } from "@/lib/admin/rules";
import { listAdminReturns, type AdminReturnRow } from "@/lib/admin/service";
import { RETURN_STATUS_LABEL } from "@/lib/returns/policy";
import { formatDateTime } from "@/lib/utils/dates";
import { formatINR } from "@/lib/utils/money";

export const dynamic = "force-dynamic";

const STATUSES: ReturnStatus[] = ["requested", "pickup_scheduled", "picked_up", "received", "refunded", "rejected"];
const TONE: Record<ReturnStatus, "info" | "warning" | "success" | "neutral" | "error"> = {
  requested: "warning",
  pickup_scheduled: "info",
  picked_up: "info",
  received: "info",
  refunded: "success",
  rejected: "error",
};

function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  return <Badge tone={TONE[status]}>{RETURN_STATUS_LABEL[status]}</Badge>;
}

const columns: Column<AdminReturnRow>[] = [
  {
    key: "created",
    header: "Requested",
    render: (r) => (
      <Link href={`/admin/returns/${r.id}`} className="whitespace-nowrap font-semibold text-primary hover:underline">
        {formatDateTime(r.createdAt)}
      </Link>
    ),
  },
  {
    key: "order",
    header: "Order",
    render: (r) => (
      <Link href={`/admin/orders/${r.orderId}`} className="hover:underline">
        {r.orderNumber}
      </Link>
    ),
  },
  {
    key: "customer",
    header: "Customer",
    render: (r) => (
      <div className="min-w-0">
        <p className="truncate">{r.customerName ?? "—"}</p>
        <p className="truncate text-xs text-text-tertiary">{r.customerEmail ?? ""}</p>
      </div>
    ),
  },
  { key: "reason", header: "Reason", render: (r) => r.reason },
  { key: "items", header: "Items", align: "right", render: (r) => r.itemCount },
  { key: "amount", header: "Refund", align: "right", render: (r) => `${formatINR(r.refundAmount)} · ${r.refundMethod}` },
  { key: "status", header: "Status", render: (r) => <ReturnStatusBadge status={r.status} /> },
];

export default async function AdminReturnsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdminPage("/admin/returns");
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as ReturnStatus) ? (sp.status as ReturnStatus) : undefined;
  const rows = await listAdminReturns(status);
  return (
    <>
      <PageHeader title="Returns" description="requested → pickup scheduled → picked up → received → refunded, or rejected with a note." />
      <nav aria-label="Filter by status" className="mb-4 flex flex-wrap gap-1">
        <Link href="/admin/returns" className={`rounded-pill border px-3 py-2 text-sm ${!status ? "border-primary bg-primary-soft text-primary" : "border-border"}`} aria-current={!status ? "page" : undefined}>
          All
        </Link>
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/returns?status=${s}`} className={`rounded-pill border px-3 py-2 text-sm ${status === s ? "border-primary bg-primary-soft text-primary" : "border-border"}`} aria-current={status === s ? "page" : undefined}>
            {RETURN_STATUS_LABEL[s]}
          </Link>
        ))}
      </nav>
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} caption="Returns" empty="No returns in this state." />
    </>
  );
}
