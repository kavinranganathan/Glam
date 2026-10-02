import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { DefinitionList, PageHeader } from "@/components/admin/data-table";
import { OrderStatusControls } from "@/components/admin/order-status-controls";
import { PaymentBadge } from "@/components/admin/orders-table";
import { ApiError } from "@/lib/api/respond";
import { requireAdminPage } from "@/lib/admin/guard";
import { getAdminOrder } from "@/lib/admin/service";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/orders/state-machine";
import { RETURN_STATUS_LABEL } from "@/lib/returns/policy";
import { formatDateTime } from "@/lib/utils/dates";
import { formatINR } from "@/lib/utils/money";

export const dynamic = "force-dynamic";

type Address = Partial<Record<"name" | "phone" | "line1" | "line2" | "landmark" | "city" | "state" | "pincode", string>>;

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdminPage(`/admin/orders/${id}`);
  const d = await getAdminOrder(id).catch((e: unknown) => {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  });
  if (!d) notFound();
  const o = d.order;
  const a = (o.address ?? {}) as Address;
  const refundInfo =
    o.payment_status === "refunded"
      ? "Refunded to GLAM wallet"
      : d.returns.find((r) => r.status === "refunded")
        ? `Refund processed (${d.returns.find((r) => r.status === "refunded")?.refund_method})`
        : null;

  return (
    <>
      <PageHeader
        title={o.order_number}
        description={`Placed ${formatDateTime(o.placed_at)} · ${o.delivery_slot.replace("_", " ")} delivery${o.estimated_delivery ? ` · ETA ${o.estimated_delivery}` : ""}`}
        actions={
          <>
            <Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>
            <PaymentBadge status={o.payment_status} method={o.payment_method} />
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(320px,380px)]">
        <div className="flex flex-col gap-4">
          <section className="rounded-card border border-border bg-background">
            <h2 className="border-b border-border px-4 py-2 font-display text-base font-semibold">Items</h2>
            <table className="w-full text-sm">
              <caption className="sr-only">Order items</caption>
              <thead className="text-left text-xs uppercase text-text-tertiary">
                <tr>
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Unit</th>
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {d.items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-4 py-2">
                      <Link href={`/p/${it.product_slug}`} className="font-medium hover:underline">
                        {it.name}
                      </Link>
                      <p className="text-xs text-text-tertiary">
                        {it.brand_name} · {it.variant_name}
                        {it.returned_qty > 0 && ` · ${it.returned_qty} returned`}
                      </p>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{it.qty}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatINR(it.unit_price)}</td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold">{formatINR(it.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <DefinitionList
              className="border-t border-border px-4 py-3 [&_dd]:text-right [&_dd]:tabular-nums"
              items={[
                { label: "Subtotal", value: formatINR(o.subtotal) },
                ...(o.item_discount ? [{ label: "Offer discount", value: `−${formatINR(o.item_discount)}` }] : []),
                ...(o.coupon_discount ? [{ label: `Coupon ${o.coupon_code ?? ""}`, value: `−${formatINR(o.coupon_discount)}` }] : []),
                ...(o.points_discount ? [{ label: `Points (${o.points_redeemed})`, value: `−${formatINR(o.points_discount)}` }] : []),
                { label: "Delivery", value: o.delivery_fee ? formatINR(o.delivery_fee) : "Free" },
                ...(o.cod_fee ? [{ label: "COD fee", value: formatINR(o.cod_fee) }] : []),
                { label: "Total", value: <strong>{formatINR(o.total)}</strong> },
              ]}
            />
          </section>

          <section className="rounded-card border border-border bg-background p-4">
            <h2 className="font-display text-base font-semibold">Timeline</h2>
            <ol className="mt-2 flex flex-col gap-2 text-sm">
              {d.events.map((ev) => (
                <li key={ev.id} className="flex gap-3">
                  <span className="w-40 shrink-0 text-xs text-text-tertiary">{formatDateTime(ev.created_at)}</span>
                  <span>
                    <Badge tone={STATUS_TONE[ev.status]}>{STATUS_LABEL[ev.status]}</Badge>
                    {ev.note && <span className="ml-2 text-text-secondary">{ev.note}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-card border border-border bg-background p-4">
            <h2 className="font-display text-base font-semibold">Payments</h2>
            <table className="mt-2 w-full text-sm">
              <caption className="sr-only">Payment attempts</caption>
              <thead className="text-left text-xs uppercase text-text-tertiary">
                <tr>
                  <th className="py-1 pr-3">Attempt</th>
                  <th className="py-1 pr-3">Method</th>
                  <th className="py-1 pr-3">Ref</th>
                  <th className="py-1 pr-3 text-right">Amount</th>
                  <th className="py-1">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {d.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-1.5 pr-3">#{p.attempt}</td>
                    <td className="py-1.5 pr-3 uppercase">{p.method}</td>
                    <td className="py-1.5 pr-3 font-mono text-xs">{p.provider_ref ?? "—"}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{formatINR(p.amount)}</td>
                    <td className="py-1.5">
                      <Badge tone={p.status === "success" ? "success" : p.status === "failed" ? "error" : p.status === "refunded" ? "neutral" : "warning"}>{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {refundInfo && <p className="mt-2 text-sm text-text-secondary">{refundInfo}</p>}
            {o.cancel_reason && <p className="mt-2 text-sm text-error">Cancelled: {o.cancel_reason}</p>}
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <OrderStatusControls orderId={o.id} status={o.status} paymentStatus={o.payment_status} simulationSteps={d.simulationSteps} />
          <section className="rounded-card border border-border bg-background p-4">
            <h2 className="font-display text-base font-semibold">Customer</h2>
            <DefinitionList
              className="mt-2"
              items={[
                { label: "Name", value: d.customer?.name ?? a.name ?? "Guest" },
                { label: "Email", value: d.customer?.email ?? o.guest_email ?? "—" },
                { label: "Phone", value: d.customer?.phone ?? a.phone ?? "—" },
              ]}
            />
            <h3 className="mt-4 text-sm font-semibold">Delivery address</h3>
            <address className="mt-1 text-sm not-italic text-text-secondary">
              {a.name && <div>{a.name}</div>}
              <div>{[a.line1, a.line2, a.landmark].filter(Boolean).join(", ")}</div>
              <div>{[a.city, a.state, a.pincode].filter(Boolean).join(" ")}</div>
              {a.phone && <div>{a.phone}</div>}
            </address>
            {(o.courier || o.awb) && (
              <DefinitionList className="mt-4" items={[{ label: "Courier", value: o.courier }, { label: "AWB", value: <span className="font-mono">{o.awb}</span> }]} />
            )}
          </section>
          {d.returns.length > 0 && (
            <section className="rounded-card border border-border bg-background p-4">
              <h2 className="font-display text-base font-semibold">Returns</h2>
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {d.returns.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2">
                    <Link href={`/admin/returns/${r.id}`} className="text-primary hover:underline">
                      {formatDateTime(r.created_at)}
                    </Link>
                    <span className="text-text-secondary">{formatINR(r.refund_amount)}</span>
                    <Badge>{RETURN_STATUS_LABEL[r.status]}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
