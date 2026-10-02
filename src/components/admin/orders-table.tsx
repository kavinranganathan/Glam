import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { AdminOrderRow } from "@/lib/admin/orders";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/orders/state-machine";
import { formatDateTime } from "@/lib/utils/dates";
import { formatINR } from "@/lib/utils/money";
import { DataTable, type Column } from "./data-table";

export const PAYMENT_TONE: Record<string, "neutral" | "info" | "success" | "warning" | "error"> = {
  pending: "warning",
  paid: "success",
  cod_pending: "info",
  failed: "error",
  refunded: "neutral",
};

export function PaymentBadge({ status, method }: { status: string; method?: string }) {
  return (
    <Badge tone={PAYMENT_TONE[status] ?? "neutral"}>
      {status.replace("_", " ")}
      {method ? ` · ${method.toUpperCase()}` : ""}
    </Badge>
  );
}

const columns: Column<AdminOrderRow>[] = [
  {
    key: "number",
    header: "Order",
    render: (o) => (
      <Link href={`/admin/orders/${o.id}`} className="font-semibold text-primary hover:underline">
        {o.orderNumber}
      </Link>
    ),
  },
  { key: "date", header: "Placed", render: (o) => <span className="whitespace-nowrap text-text-secondary">{formatDateTime(o.placedAt)}</span> },
  {
    key: "customer",
    header: "Customer",
    render: (o) => (
      <div className="min-w-0">
        <p className="truncate">{o.customerName ?? "Guest"}</p>
        <p className="truncate text-xs text-text-tertiary">{o.customerEmail ?? "—"}</p>
      </div>
    ),
  },
  { key: "items", header: "Items", align: "right", render: (o) => o.itemCount },
  { key: "total", header: "Total", align: "right", render: (o) => <span className="font-semibold">{formatINR(o.total)}</span> },
  { key: "payment", header: "Payment", render: (o) => <PaymentBadge status={o.paymentStatus} method={o.paymentMethod} /> },
  { key: "status", header: "Status", render: (o) => <Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge> },
  {
    key: "link",
    header: <span className="sr-only">Open</span>,
    render: (o) => (
      <Link href={`/admin/orders/${o.id}`} className="text-sm font-semibold text-primary">
        View
      </Link>
    ),
  },
];

export function OrdersTable({ rows, empty }: { rows: AdminOrderRow[]; empty?: string }) {
  return <DataTable columns={columns} rows={rows} rowKey={(o) => o.id} caption="Orders" empty={empty} />;
}
