import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Clock, CreditCard, FileText, MapPin } from "lucide-react";
import { TrackOnMount } from "@/components/analytics/screen-view";
import { AddressBlock } from "@/components/orders/address-block";
import { OrderItems } from "@/components/orders/order-items";
import { OrderTotals } from "@/components/orders/order-totals";
import { Shelf } from "@/components/product/shelf";
import { Button } from "@/components/ui/button";
import type { ProductCard } from "@/lib/catalogue/types";
import { getProductBySlug } from "@/lib/catalogue/queries";
import { orderIdentity } from "@/lib/orders/identity";
import { getOrder } from "@/lib/orders/queries";
import type { OrderDetail, OrderIdentity } from "@/lib/orders/views";
import { PAYMENT_METHOD_LABEL } from "@/lib/payments/provider";
import { homeShelves, relatedProducts } from "@/lib/recommendations/shelves";
import { formatShortDate } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Order confirmed" };

const CONFETTI = ["#DB2777", "#7C3AED", "#F59E0B", "#10B981", "#3B82F6", "#EC4899", "#8B5CF6", "#F97316", "#14B8A6", "#DB2777", "#7C3AED", "#F59E0B"];

async function youMayAlsoLike(order: OrderDetail, identity: OrderIdentity): Promise<ProductCard[]> {
  try {
    const first = order.items[0];
    const product = first ? await getProductBySlug(first.slug) : null;
    if (product) {
      const rel = await relatedProducts(product);
      const ordered = new Set(order.items.map((i) => i.productId));
      const picks = [...rel.alsoLike, ...rel.fbt].filter((p) => !ordered.has(p.id));
      if (picks.length >= 4) return picks.slice(0, 10);
    }
    const shelves = await homeShelves(identity.user, identity.sessionId ?? "");
    return shelves[0]?.items ?? [];
  } catch {
    return [];
  }
}

export default async function ConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const identity = await orderIdentity();
  const order = await getOrder(id, identity);
  if (!order) {
    if (!identity.user) redirect(`/login?next=${encodeURIComponent(`/orders/${id}/confirmation`)}`);
    notFound();
  }
  const pending = order.paymentStatus === "pending" && order.status === "placed";
  const shelf = pending ? [] : await youMayAlsoLike(order, identity);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {!pending && (
        <TrackOnMount
          event="purchase"
          props={{
            order_id: order.id,
            order_number: order.orderNumber,
            gmv: order.total,
            items: order.items.map((i) => i.productId ?? i.slug),
            item_count: order.itemCount,
            payment_method: order.paymentMethod,
            coupon: order.couponCode,
          }}
        />
      )}

      <header className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-primary-soft to-background px-6 pb-8 pt-10 text-center">
        {!pending && (
          <div className="confetti pointer-events-none absolute inset-0" aria-hidden>
            {CONFETTI.map((c, i) => (
              <span key={i} className="confetti-dot" style={{ left: `${6 + i * 7.5}%`, backgroundColor: c, animationDelay: `${(i % 4) * 0.15}s`, animationDuration: `${1.6 + (i % 3) * 0.4}s` }} />
            ))}
          </div>
        )}
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${pending ? "bg-warning-soft text-warning" : "bg-success-soft text-success"}`}>
          {pending ? <Clock className="h-9 w-9" aria-hidden /> : <CheckCircle2 className="h-9 w-9" aria-hidden />}
        </div>
        <h1 className="mt-4 font-display text-2xl font-bold text-text md:text-3xl">{pending ? "Payment pending" : "Order confirmed!"}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Order <span className="font-semibold text-text">{order.orderNumber}</span>
        </p>
        {pending ? (
          <>
            <p className="mx-auto mt-3 max-w-md text-sm text-text-secondary">We have reserved your items, but the payment has not gone through yet. Complete it to confirm your order.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button href={`/checkout/pay/${order.id}`}>Complete payment</Button>
              <Button variant="outline" href={`/orders/${order.id}`}>
                View order
              </Button>
            </div>
          </>
        ) : (
          <>
            {order.estimatedDelivery && (
              <p className="mt-3 text-base text-text">
                Arriving by <span className="font-semibold">{formatShortDate(order.estimatedDelivery)}</span>
              </p>
            )}
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button href={`/orders/${order.id}`}>Track order</Button>
              <Button variant="outline" href="/">
                Continue shopping
              </Button>
            </div>
          </>
        )}
      </header>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-card border border-border p-4" aria-labelledby="c-address">
          <h2 id="c-address" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text-tertiary">
            <MapPin className="h-4 w-4" aria-hidden /> Delivering to
          </h2>
          <AddressBlock address={order.address} className="mt-2" />
        </section>
        <section className="rounded-card border border-border p-4" aria-labelledby="c-payment">
          <h2 id="c-payment" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-text-tertiary">
            <CreditCard className="h-4 w-4" aria-hidden /> Payment
          </h2>
          <p className="mt-2 text-sm text-text">{PAYMENT_METHOD_LABEL[order.paymentMethod]}</p>
          <div className="mt-2">
            <OrderTotals order={order} showPayment={false} />
          </div>
          {!pending && (
            <a href={`/orders/${order.id}/invoice`} target="_blank" rel="noopener" className="btn mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary">
              <FileText className="h-4 w-4" aria-hidden /> Invoice
            </a>
          )}
        </section>
      </div>

      <section className="mt-4 rounded-card border border-border p-4" aria-labelledby="c-items">
        <h2 id="c-items" className="text-sm font-semibold uppercase tracking-wide text-text-tertiary">
          {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
        </h2>
        <OrderItems items={order.items} status={order.status} compact />
      </section>

      {shelf.length > 0 && <Shelf title="You may also like" items={shelf} shelfKey="confirmation_also_like" className="mt-6 -mx-4" />}

      <style>{`
        .confetti-dot { position: absolute; top: -8px; width: 8px; height: 8px; border-radius: 9999px; opacity: 0; animation-name: confetti-fall; animation-timing-function: ease-in; animation-iteration-count: 1; animation-fill-mode: forwards; }
        .confetti-dot:nth-child(odd) { border-radius: 2px; }
        @keyframes confetti-fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(220px) rotate(300deg); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .confetti { display: none; } }
      `}</style>
    </div>
  );
}
