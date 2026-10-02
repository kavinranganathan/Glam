import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataTable, PageHeader, type Column } from "@/components/admin/data-table";
import { requireAdminPage } from "@/lib/admin/guard";
import { listOutbox, type OutboxChannel, type OutboxRow } from "@/lib/admin/service";
import { formatDateTime } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";

const CHANNELS: OutboxChannel[] = ["sms", "email", "push"];
const TONE: Record<OutboxChannel, "info" | "secondary" | "primary"> = { sms: "info", email: "secondary", push: "primary" };

const columns: Column<OutboxRow>[] = [
  { key: "time", header: "Time", render: (m) => <span className="whitespace-nowrap text-xs text-text-secondary">{formatDateTime(m.created_at)}</span> },
  { key: "channel", header: "Channel", render: (m) => <Badge tone={TONE[m.channel]}>{m.channel.toUpperCase()}</Badge> },
  { key: "to", header: "Recipient", render: (m) => <span className="break-all text-xs">{m.recipient}</span> },
  {
    key: "msg",
    header: "Message",
    render: (m) => (
      <div className="max-w-xl">
        {m.subject && <p className="font-semibold">{m.subject}</p>}
        <p className="text-text-secondary">{m.body}</p>
      </div>
    ),
  },
];

export default async function AdminOutboxPage({ searchParams }: { searchParams: Promise<{ channel?: string }> }) {
  await requireAdminPage("/admin/outbox");
  const sp = await searchParams;
  const channel = CHANNELS.includes(sp.channel as OutboxChannel) ? (sp.channel as OutboxChannel) : undefined;
  const rows = await listOutbox(channel);
  return (
    <>
      <PageHeader title="Outbox" description="Simulated SMS / email / push sends. Nothing leaves the building — this is the log notifications would have produced." />
      <nav aria-label="Filter by channel" className="mb-4 flex gap-1">
        <Link href="/admin/outbox" className={`rounded-pill border px-3 py-2 text-sm ${!channel ? "border-primary bg-primary-soft text-primary" : "border-border"}`} aria-current={!channel ? "page" : undefined}>
          All
        </Link>
        {CHANNELS.map((c) => (
          <Link key={c} href={`/admin/outbox?channel=${c}`} className={`rounded-pill border px-3 py-2 text-sm uppercase ${channel === c ? "border-primary bg-primary-soft text-primary" : "border-border"}`} aria-current={channel === c ? "page" : undefined}>
            {c}
          </Link>
        ))}
      </nav>
      <DataTable columns={columns} rows={rows} rowKey={(m) => m.id} caption="Outbox" empty="No messages yet." />
    </>
  );
}
