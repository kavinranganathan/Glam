import { PAYMENT_METHOD_LABEL } from "@/lib/payments/provider";
import type { OrderDetail, PaymentStatus } from "@/lib/orders/views";
import { formatINR } from "@/lib/utils/money";
import { Badge } from "@/components/ui/badge";

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Payment pending",
  paid: "Paid",
  cod_pending: "Pay on delivery",
  failed: "Payment failed",
  refunded: "Refunded",
};

const PAYMENT_STATUS_TONE: Record<PaymentStatus, "neutral" | "info" | "success" | "warning" | "error"> = {
  pending: "warning",
  paid: "success",
  cod_pending: "info",
  failed: "error",
  refunded: "neutral",
};

type Totals = Pick<
  OrderDetail,
  "subtotal" | "itemDiscount" | "couponCode" | "couponDiscount" | "pointsRedeemed" | "pointsDiscount" | "deliveryFee" | "codFee" | "total" | "paymentMethod" | "paymentStatus"
>;

/** Payment summary: method, status and the price breakdown. */
export function OrderTotals({ order, showPayment = true }: { order: Totals; showPayment?: boolean }) {
  const rows: Array<{ label: string; value: string; tone?: "discount" }> = [
    { label: "Item total", value: formatINR(order.subtotal) },
  ];
  if (order.itemDiscount > 0) rows.push({ label: "Offer discount", value: `−${formatINR(order.itemDiscount)}`, tone: "discount" });
  if (order.couponDiscount > 0) rows.push({ label: `Coupon${order.couponCode ? ` (${order.couponCode})` : ""}`, value: `−${formatINR(order.couponDiscount)}`, tone: "discount" });
  if (order.pointsDiscount > 0) rows.push({ label: `Points redeemed (${order.pointsRedeemed})`, value: `−${formatINR(order.pointsDiscount)}`, tone: "discount" });
  rows.push({ label: "Delivery", value: order.deliveryFee === 0 ? "Free" : formatINR(order.deliveryFee) });
  if (order.codFee > 0) rows.push({ label: "COD fee", value: formatINR(order.codFee) });
  return (
    <div className="text-sm">
      {showPayment && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="text-text-secondary">{PAYMENT_METHOD_LABEL[order.paymentMethod]}</span>
          <Badge tone={PAYMENT_STATUS_TONE[order.paymentStatus]}>{PAYMENT_STATUS_LABEL[order.paymentStatus]}</Badge>
        </div>
      )}
      <dl className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-3">
            <dt className="text-text-secondary">{r.label}</dt>
            <dd className={r.tone === "discount" ? "font-medium text-success" : "text-text"}>{r.value}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 border-t border-border pt-2 text-base font-semibold text-text">
          <dt>Total</dt>
          <dd>{formatINR(order.total)}</dd>
        </div>
      </dl>
      <p className="mt-1 text-xs text-text-tertiary">Prices inclusive of GST.</p>
    </div>
  );
}
