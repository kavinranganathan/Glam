import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, CreditCard, MapPin, Truck, Undo2 } from "lucide-react";
import { AddressBlock } from "@/components/orders/address-block";
import { OrderActions } from "@/components/orders/order-actions";
import { OrderItems } from "@/components/orders/order-items";
import { OrderTotals } from "@/components/orders/order-totals";
import { StatusTimeline } from "@/components/orders/status-timeline";
import { TrackingSheet } from "@/components/orders/tracking-sheet";
import { Badge } from "@/components/ui/badge";
import { orderIdentity } from "@/lib/orders/identity";
import { getOrder } from "@/lib/orders/queries";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/orders/state-machine";
import { RETURN_STATUS_LABEL } from "@/lib/returns/policy";
import { rescheduleDates } from "@/lib/returns/rules";
import { getReturnableItems } from "@/lib/returns/service";
import { formatDateTime, formatShortDate } from "@/lib/utils/dates";
import { formatINR } from "@/lib/utils/money";

export const metadata: Metadata = { title: "Order details" };

const SLOT_LABEL = { standard: "Standard delivery", next_day: "Next-day delivery", same_day: "Same-day delivery" } as const;

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const identity = await orderIdentity();
  const order = await getOrder(id, identity);
  if (!order) {
    if (!identity.user) redirect(`/login?next=${encodeURIComponent(`/orders/${id}`)}`);
    notFound();
  }
  const canReturn = order.status === "delivered" && getReturnableItems(order).some((e) => e.eligible);
  const inTransit = ["shipped", "out_for_delivery", "failed_delivery"].includes(order.status);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Link href="/orders" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-text-secondary">
        <ChevronLeft className="h-4 w-4" aria-hidden /> All orders
      </Link>

      <header className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">{order.orderNumber}</h1>
          <p className="text-sm text-text-tertiary">Placed {formatDateTime(order.placedAt)}</p>
        </div>
        <Badge tone={STATUS_TONE[order.status]} className="text-sm">
          {STATUS_LABEL[order.status]}
        </Badge>
      </header>

      {order.paymentStatus === "pending" && order.status === "placed" && (
        <div role="status" className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-card border border-warning/30 bg-warning-soft p-3 text-sm text-warning">
          <span className="font-semibold">Payment pending — complete it to confirm this order.</span>
          <Link href={`/checkout/pay/${order.id}`} className="btn inline-flex min-h-11 items-center rounded-pill bg-warning px-4 font-semibold text-white">
            Pay now
          </Link>
        </div>
      )}

      <section className="mt-6 rounded-card border border-border p-4" aria-labelledby="progress">
        <h2 id="progress" className="sr-only">
          Order progress
        </h2>
        <StatusTimeline status={order.status} events={order.events} cancelReason={order.cancelReason} />
        {order.estimatedDelivery && ["placed", "processing", "shipped", "out_for_delivery"].includes(order.status) && (
          <p className="mt-2 text-sm text-text-secondary">
            Estimated delivery <span className="font-semibold text-text">{formatShortDate(order.estimatedDelivery)}</span> · {SLOT_LABEL[order.deliverySlot]}
          </p>
        )}
        {order.deliveredAt && <p className="mt-2 text-sm text-text-secondary">Delivered {formatDateTime(order.deliveredAt)}</p>}
        {(order.courier || order.awb) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-card bg-surface p-3 text-sm">
            <span className="inline-flex items-center gap-2 text-text">
              <Truck className="h-4 w-4 text-primary" aria-hidden /> {order.courier ?? "Courier"}
            </span>
            {order.awb && (
              <span className="text-text-secondary">
                AWB <span className="font-mono">{order.awb}</span>
              </span>
            )}
            {!inTransit && <TrackingSheet trigger="link" orderNumber={order.orderNumber} courier={order.courier} awb={order.awb} events={order.events} estimatedDelivery={order.estimatedDelivery} />}
          </div>
        )}
        <div className="mt-4">
          <OrderActions order={order} rescheduleDates={rescheduleDates()} canReturn={canReturn} />
        </div>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-5">
        <section id="items" className="rounded-card border border-border p-4 md:col-span-3" aria-labelledby="items-h">
          <h2 id="items-h" className="font-display text-lg font-semibold">
            Items ({order.itemCount})
          </h2>
          <OrderItems items={order.items} status={order.status} />
        </section>

        <div className="flex flex-col gap-6 md:col-span-2">
          <section className="rounded-card border border-border p-4" aria-labelledby="address-h">
            <h2 id="address-h" className="flex items-center gap-2 font-display text-lg font-semibold">
              <MapPin className="h-4 w-4 text-primary" aria-hidden /> Delivery address
            </h2>
            <AddressBlock address={order.address} className="mt-2" />
          </section>
          <section className="rounded-card border border-border p-4" aria-labelledby="payment-h">
            <h2 id="payment-h" className="flex items-center gap-2 font-display text-lg font-semibold">
              <CreditCard className="h-4 w-4 text-primary" aria-hidden /> Payment
            </h2>
            <div className="mt-2">
              <OrderTotals order={order} />
            </div>
          </section>
        </div>
      </div>

      <section id="returns" className="mt-6 rounded-card border border-border p-4 scroll-mt-20" aria-labelledby="returns-h">
        <h2 id="returns-h" className="flex items-center gap-2 font-display text-lg font-semibold">
          <Undo2 className="h-4 w-4 text-primary" aria-hidden /> Returns &amp; refunds
        </h2>
        {order.status === "cancelled" && (
          <p className="mt-2 text-sm text-text-secondary">
            {order.paymentStatus === "refunded"
              ? `${formatINR(order.total)} was credited to your GLAM wallet when this order was cancelled.`
              : "No payment was captured for this order, so there is nothing to refund."}
          </p>
        )}
        {order.returns.length === 0 && order.status !== "cancelled" && (
          <p className="mt-2 text-sm text-text-secondary">
            {canReturn ? (
              <>
                Changed your mind? You can <Link href={`/orders/${order.id}/return`} className="font-semibold text-primary">request a return</Link> for eligible items.
              </>
            ) : (
              "No returns on this order."
            )}
          </p>
        )}
        {order.returns.length > 0 && (
          <ul className="mt-2 divide-y divide-border">
            {order.returns.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-text">{RETURN_STATUS_LABEL[r.status] ?? r.status}</p>
                  <p className="text-xs text-text-tertiary">
                    Requested {formatShortDate(r.createdAt)} · Refund {formatINR(r.refundAmount)} to {r.refundMethod === "wallet" ? "GLAM Wallet" : "original payment method"}
                  </p>
                </div>
                <Link href={`/returns/${r.id}`} className="btn inline-flex min-h-11 items-center text-sm font-semibold text-primary">
                  Track return
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
