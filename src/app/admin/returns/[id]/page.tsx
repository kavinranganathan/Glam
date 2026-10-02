import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { DefinitionList, PageHeader } from "@/components/admin/data-table";
import { ReturnsControls } from "@/components/admin/returns-controls";
import { ApiError } from "@/lib/api/respond";
import { requireAdminPage } from "@/lib/admin/guard";
import { getAdminReturn } from "@/lib/admin/service";
import { STATUS_LABEL } from "@/lib/orders/state-machine";
import { RETURN_STATUS_LABEL } from "@/lib/returns/policy";
import { formatDateTime } from "@/lib/utils/dates";
import { formatINR } from "@/lib/utils/money";

export const dynamic = "force-dynamic";

type Address = Partial<Record<"name" | "phone" | "line1" | "line2" | "city" | "state" | "pincode", string>>;

export default async function AdminReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdminPage(`/admin/returns/${id}`);
  const d = await getAdminReturn(id).catch((e: unknown) => {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  });
  if (!d) notFound();
  const r = d.ret;
  const a = (r.pickup_address ?? {}) as Address;
  return (
    <>
      <PageHeader
        title={`Return · ${d.order?.order_number ?? ""}`}
        description={`Requested ${formatDateTime(r.created_at)} · ${r.reason}`}
        actions={<Badge tone={r.status === "refunded" ? "success" : r.status === "rejected" ? "error" : "warning"}>{RETURN_STATUS_LABEL[r.status]}</Badge>}
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(320px,380px)]">
        <div className="flex flex-col gap-4">
          <section className="rounded-card border border-border bg-background p-4">
            <h2 className="font-display text-base font-semibold">Items</h2>
            <ul className="mt-2 divide-y divide-border text-sm">
              {d.items.map((ri) => (
                <li key={ri.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    <span className="font-medium">{ri.item?.name ?? "Item"}</span>
                    <span className="block text-xs text-text-tertiary">
                      {ri.item?.brand_name} · {ri.item?.variant_name}
                    </span>
                  </span>
                  <span className="tabular-nums">
                    {ri.qty} × {ri.item ? formatINR(ri.item.unit_price) : "—"}
                  </span>
                </li>
              ))}
            </ul>
            <DefinitionList
              className="mt-3 border-t border-border pt-3"
              items={[
                { label: "Refund amount", value: <strong>{formatINR(r.refund_amount)}</strong> },
                { label: "Refund method", value: r.refund_method === "wallet" ? "GLAM wallet (instant)" : `Original method (${d.order?.payment_method.toUpperCase() ?? "—"}, 5–7 days)` },
                { label: "Pickup AWB", value: <span className="font-mono">{r.awb ?? "—"}</span> },
                { label: "Pickup window", value: r.pickup_scheduled_for ? formatDateTime(r.pickup_scheduled_for) : "—" },
              ]}
            />
          </section>
          {r.comment && (
            <section className="rounded-card border border-border bg-background p-4">
              <h2 className="font-display text-base font-semibold">Customer comment</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">{r.comment}</p>
            </section>
          )}
          <section className="rounded-card border border-border bg-background p-4">
            <h2 className="font-display text-base font-semibold">Photos</h2>
            {r.photos.length ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {r.photos.map((src, i) => (
                  <li key={src}>
                    <a href={src} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element -- customer-supplied URL */}
                      <img src={src} alt={`Return photo ${i + 1}`} className="h-28 w-28 rounded-card border border-border object-cover" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-text-tertiary">No photos attached.</p>
            )}
          </section>
          <section className="rounded-card border border-border bg-background p-4">
            <h2 className="font-display text-base font-semibold">Timeline</h2>
            <ol className="mt-2 flex flex-col gap-2 text-sm">
              {d.events.map((ev) => (
                <li key={ev.id} className="flex gap-3">
                  <span className="w-40 shrink-0 text-xs text-text-tertiary">{formatDateTime(ev.created_at)}</span>
                  <span>
                    <Badge>{RETURN_STATUS_LABEL[ev.status]}</Badge>
                    {ev.note && <span className="ml-2 text-text-secondary">{ev.note}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <div className="flex flex-col gap-4">
          <ReturnsControls returnId={r.id} status={r.status} nextStatuses={d.nextStatuses} />
          <section className="rounded-card border border-border bg-background p-4">
            <h2 className="font-display text-base font-semibold">Order & customer</h2>
            <DefinitionList
              className="mt-2"
              items={[
                {
                  label: "Order",
                  value: d.order ? (
                    <Link href={`/admin/orders/${d.order.id}`} className="text-primary hover:underline">
                      {d.order.order_number} · {STATUS_LABEL[d.order.status]}
                    </Link>
                  ) : (
                    "—"
                  ),
                },
                { label: "Delivered", value: d.order?.delivered_at ? formatDateTime(d.order.delivered_at) : "—" },
                { label: "Name", value: d.customer?.name ?? a.name },
                { label: "Email", value: d.customer?.email },
                { label: "Phone", value: d.customer?.phone ?? a.phone },
              ]}
            />
            <h3 className="mt-4 text-sm font-semibold">Pickup address</h3>
            <address className="mt-1 text-sm not-italic text-text-secondary">
              <div>{[a.line1, a.line2].filter(Boolean).join(", ")}</div>
              <div>{[a.city, a.state, a.pincode].filter(Boolean).join(" ")}</div>
            </address>
          </section>
        </div>
      </div>
    </>
  );
}
