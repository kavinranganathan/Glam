import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataTable, PageHeader, type Column } from "@/components/admin/data-table";
import { TicketStatusSelect } from "@/components/admin/ticket-status";
import { requireAdminPage } from "@/lib/admin/guard";
import { listTickets, type TicketRow, type TicketStatus } from "@/lib/admin/service";
import { formatDateTime } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";

const STATUSES: TicketStatus[] = ["open", "in_progress", "resolved"];

const columns: Column<TicketRow>[] = [
  { key: "time", header: "Opened", render: (t) => <span className="whitespace-nowrap text-xs text-text-secondary">{formatDateTime(t.created_at)}</span> },
  { key: "kind", header: "Kind", render: (t) => <Badge tone={t.kind === "callback" ? "secondary" : "neutral"}>{t.kind}</Badge> },
  {
    key: "who",
    header: "Customer",
    render: (t) => (
      <div className="min-w-0">
        <p className="truncate">{t.profiles?.name ?? "—"}</p>
        <p className="truncate text-xs text-text-tertiary">{t.profiles?.email ?? ""}</p>
      </div>
    ),
  },
  {
    key: "subject",
    header: "Subject",
    render: (t) => (
      <div className="max-w-md">
        <p className="font-semibold">{t.subject}</p>
        <p className="line-clamp-3 text-text-secondary">{t.body}</p>
      </div>
    ),
  },
  { key: "status", header: "Status", render: (t) => <TicketStatusSelect ticketId={t.id} status={t.status} /> },
];

export default async function AdminTicketsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdminPage("/admin/tickets");
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as TicketStatus) ? (sp.status as TicketStatus) : undefined;
  const rows = await listTickets(status);
  return (
    <>
      <PageHeader title="Support tickets" description="Help-centre tickets and callback requests." />
      <nav aria-label="Filter by status" className="mb-4 flex gap-1">
        <Link href="/admin/tickets" className={`rounded-pill border px-3 py-2 text-sm ${!status ? "border-primary bg-primary-soft text-primary" : "border-border"}`} aria-current={!status ? "page" : undefined}>
          All
        </Link>
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/tickets?status=${s}`} className={`rounded-pill border px-3 py-2 text-sm ${status === s ? "border-primary bg-primary-soft text-primary" : "border-border"}`} aria-current={status === s ? "page" : undefined}>
            {s.replace("_", " ")}
          </Link>
        ))}
      </nav>
      <DataTable columns={columns} rows={rows} rowKey={(t) => t.id} caption="Support tickets" empty="No tickets." />
    </>
  );
}
