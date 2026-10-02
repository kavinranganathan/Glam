import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarClock, ChevronLeft, MapPin, Truck, Wallet } from "lucide-react";
import { AddressBlock } from "@/components/orders/address-block";
import { ReturnTimeline } from "@/components/orders/return-timeline";
import { Badge } from "@/components/ui/badge";
import { orderIdentity } from "@/lib/orders/identity";
import { RETURN_STATUS_LABEL } from "@/lib/returns/policy";
import { getReturn } from "@/lib/returns/service";
import { formatDateTime, formatShortDate } from "@/lib/utils/dates";
import { formatINR } from "@/lib/utils/money";

export const metadata: Metadata = { title: "Return status" };

const TONE: Record<string, "neutral" | "info" | "success" | "warning" | "error"> = {
  requested: "warning",
  pickup_scheduled: "info",
  picked_up: "info",
  received: "info",
  refunded: "success",
  rejected: "error",
};

export default async function ReturnStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const identity = await orderIdentity();
  const ret = await getReturn(id, identity);
  if (!ret) {
    if (!identity.user) redirect(`/login?next=${encodeURIComponent(`/returns/${id}`)}`);
    notFound();
  }
  const refunded = ret.status === "refunded";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link href={`/orders/${ret.orderId}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-text-secondary">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Order {ret.orderNumber}
      </Link>
      <header className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Return request</h1>
          <p className="text-sm text-text-tertiary">Requested {formatDateTime(ret.createdAt)}</p>
        </div>
        <Badge tone={TONE[ret.status] ?? "neutral"} className="text-sm">
          {RETURN_STATUS_LABEL[ret.status] ?? ret.status}
        </Badge>
      </header>

      <section className="mt-6 rounded-card border border-border p-4" aria-labelledby="r-progress">
        <h2 id="r-progress" className="sr-only">
          Return progress
        </h2>
        <ReturnTimeline status={ret.status} events={ret.events} />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2 rounded-card bg-surface p-3 text-sm">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="font-semibold text-text">Pickup</p>
              <p className="text-text-secondary">{ret.pickupScheduledFor ? `Scheduled for ${formatShortDate(ret.pickupScheduledFor)}` : "Scheduling within 24 hours"}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-card bg-surface p-3 text-sm">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="font-semibold text-text">Return AWB</p>
              <p className="font-mono text-text-secondary">{ret.awb ?? "To be assigned"}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-5">
        <section className="rounded-card border border-border p-4 md:col-span-3" aria-labelledby="r-items">
          <h2 id="r-items" className="font-display text-lg font-semibold">
            Items being returned
          </h2>
          <ul className="mt-2 divide-y divide-border">
            {ret.items.map((it) => (
              <li key={it.orderItemId} className="flex gap-3 py-3">
                <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-card bg-surface">
                  {it.image && <Image src={it.image} alt="" fill sizes="56px" className="object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">{it.brandName}</p>
                  <p className="line-clamp-2 text-sm font-medium text-text">{it.name}</p>
                  <p className="text-xs text-text-tertiary">
                    {it.variantName && it.variantName !== "Default" ? `${it.variantName} · ` : ""}Qty {it.qty}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 rounded-card bg-surface p-3 text-sm">
            <p className="font-semibold text-text">Reason: {ret.reason}</p>
            {ret.comment && <p className="mt-0.5 text-text-secondary">{ret.comment}</p>}
            {ret.photos.length > 0 && (
              <ul className="mt-2 flex gap-2" aria-label="Photos attached">
                {ret.photos.map((p, i) => (
                  <li key={p} className="relative h-16 w-16 overflow-hidden rounded-card border border-border">
                    <Image src={p} alt={`Photo ${i + 1}`} fill sizes="64px" className="object-cover" unoptimized />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <div className="flex flex-col gap-6 md:col-span-2">
          <section className="rounded-card border border-border p-4" aria-labelledby="r-refund">
            <h2 id="r-refund" className="flex items-center gap-2 font-display text-lg font-semibold">
              <Wallet className="h-4 w-4 text-primary" aria-hidden /> Refund
            </h2>
            <p className="mt-2 text-2xl font-bold text-text">{formatINR(ret.refundAmount)}</p>
            <p className="text-sm text-text-secondary">{ret.refundMethod === "wallet" ? "To GLAM Wallet" : "To original payment method"}</p>
            <p className="mt-1 text-sm text-text-tertiary">
              {refunded && ret.refundedAt ? `Processed ${formatDateTime(ret.refundedAt)}` : ret.status === "rejected" ? "No refund will be issued for a rejected return." : `ETA: ${ret.refundEta} after we receive the item`}
            </p>
          </section>
          <section className="rounded-card border border-border p-4" aria-labelledby="r-address">
            <h2 id="r-address" className="flex items-center gap-2 font-display text-lg font-semibold">
              <MapPin className="h-4 w-4 text-primary" aria-hidden /> Pickup address
            </h2>
            <AddressBlock address={ret.pickupAddress} className="mt-2" />
          </section>
        </div>
      </div>
    </div>
  );
}
