import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ReturnForm } from "@/components/orders/return-form";
import { EmptyState } from "@/components/ui/empty-state";
import { orderIdentity } from "@/lib/orders/identity";
import { getOrder } from "@/lib/orders/queries";
import { getReturnableItems } from "@/lib/returns/service";

export const metadata: Metadata = { title: "Return items" };

export default async function ReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const identity = await orderIdentity();
  if (!identity.user) redirect(`/login?next=${encodeURIComponent(`/orders/${id}/return`)}`);
  const order = await getOrder(id, identity);
  if (!order) notFound();
  const eligibility = getReturnableItems(order);
  const anyEligible = order.status === "delivered" && eligibility.some((e) => e.eligible);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link href={`/orders/${order.id}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-text-secondary">
        <ChevronLeft className="h-4 w-4" aria-hidden /> Back to order
      </Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-text">Return items</h1>
      <p className="text-sm text-text-tertiary">Order {order.orderNumber}</p>
      <div className="mt-6">
        {anyEligible ? (
          <ReturnForm order={order} eligibility={eligibility} />
        ) : (
          <EmptyState
            title={order.status === "delivered" ? "Nothing to return" : order.status === "return_initiated" ? "A return is already in progress" : "Returns open after delivery"}
            description={
              order.status === "delivered"
                ? "The items in this order are either non-returnable, already returned, or past their return window."
                : order.status === "return_initiated"
                  ? "Track your existing return from the order page."
                  : "You can request a return once the order has been delivered."
            }
            action={{ label: "Back to order", href: `/orders/${order.id}` }}
            secondary={{ label: "Help centre", href: "/help" }}
          />
        )}
      </div>
    </div>
  );
}
