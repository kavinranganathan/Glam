import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/orders/state-machine";
import type { OrderSummary } from "@/lib/orders/views";
import { formatShortDate } from "@/lib/utils/dates";
import { formatINR } from "@/lib/utils/money";

function primaryAction(order: OrderSummary): { label: string; href: string } {
  switch (order.status) {
    case "shipped":
    case "out_for_delivery":
    case "failed_delivery":
      return { label: "Track order", href: `/orders/${order.id}` };
    case "delivered":
      return { label: "Rate & review", href: `/orders/${order.id}#items` };
    case "return_initiated":
    case "returned":
    case "refunded":
      return { label: "View return", href: `/orders/${order.id}#returns` };
    case "cancelled":
      return { label: "View refund", href: `/orders/${order.id}#returns` };
    default:
      return order.paymentStatus === "pending" ? { label: "Complete payment", href: `/checkout/pay/${order.id}` } : { label: "View details", href: `/orders/${order.id}` };
  }
}

/** Order row on /orders: stacked thumbnails, number, date, status badge, total and the primary next step. */
export function OrderCard({ order }: { order: OrderSummary }) {
  const action = primaryAction(order);
  const more = order.itemCount - order.images.length;
  return (
    <article className="rounded-card border border-border bg-background shadow-card">
      <Link href={`/orders/${order.id}`} className="flex items-center gap-3 p-4" aria-label={`Order ${order.orderNumber}, ${STATUS_LABEL[order.status]}`}>
        <div className="relative h-16 w-20 shrink-0" aria-hidden>
          {order.images.length === 0 && (
            <div className="flex h-16 w-16 items-center justify-center rounded-card bg-surface text-text-tertiary">
              <Package className="h-6 w-6" />
            </div>
          )}
          {order.images.map((src, i) => (
            <div
              key={`${src}-${i}`}
              className="absolute top-0 h-16 w-16 overflow-hidden rounded-card border-2 border-background bg-surface"
              style={{ left: i * 10, zIndex: 3 - i }}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-cover" />
            </div>
          ))}
          {more > 0 && (
            <span className="absolute -bottom-1 -right-1 z-10 rounded-pill bg-text px-1.5 text-[11px] font-bold text-white">+{more}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-text">{order.orderNumber}</p>
            <Badge tone={STATUS_TONE[order.status]}>{STATUS_LABEL[order.status]}</Badge>
          </div>
          <p className="mt-0.5 truncate text-sm text-text-secondary">
            {order.firstName}
            {order.itemCount > 1 && ` + ${order.itemCount - 1} more`}
          </p>
          <p className="mt-0.5 text-xs text-text-tertiary">
            Placed {formatShortDate(order.placedAt)} · {formatINR(order.total)}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-text-tertiary" aria-hidden />
      </Link>
      <div className="flex items-center justify-between border-t border-border px-4 py-2">
        <span className="text-xs text-text-tertiary">
          {order.estimatedDelivery && ["placed", "processing", "shipped", "out_for_delivery"].includes(order.status)
            ? `Arriving ${formatShortDate(order.estimatedDelivery)}`
            : `${order.itemCount} item${order.itemCount === 1 ? "" : "s"}`}
        </span>
        <Link href={action.href} className="btn inline-flex min-h-11 items-center px-3 text-sm font-semibold text-primary">
          {action.label}
        </Link>
      </div>
    </article>
  );
}
