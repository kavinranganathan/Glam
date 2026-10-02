import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SimulatedGateway } from "@/components/checkout/simulated-gateway";
import { ApiError } from "@/lib/api/respond";
import { checkoutIdentity } from "@/lib/orders/checkout-identity";
import { confirmationUrl, getOrderForPayment } from "@/lib/orders/service";

export const metadata: Metadata = { title: "Payment" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PayPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  if (!UUID.test(orderId)) notFound();
  let order;
  try {
    order = await getOrderForPayment(orderId, await checkoutIdentity());
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  if (order.paymentStatus === "paid" || order.paymentStatus === "cod_pending") redirect(confirmationUrl(order.id));
  return <SimulatedGateway order={order} />;
}
