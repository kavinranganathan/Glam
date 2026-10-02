import { orderIdentity } from "@/lib/orders/identity";
import { getOrder } from "@/lib/orders/queries";
import type { OrderAddress, OrderDetail } from "@/lib/orders/views";
import { PAYMENT_METHOD_LABEL } from "@/lib/payments/provider";
import { formatDateTime } from "@/lib/utils/dates";
import { formatINR } from "@/lib/utils/money";

type Ctx = { params: Promise<{ id: string }> };

const SELLER = {
  name: "GLAM Technologies Pvt. Ltd.",
  address: "4th Floor, Prestige Tech Park, Outer Ring Road, Bengaluru, Karnataka 560103",
  gstin: "29AAACG1234F1Z5",
  cin: "U52100KA2024PTC123456",
  email: "care@glam.in",
};

function esc(v: unknown): string {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
}

function addressHtml(a: OrderAddress): string {
  const lines = [a.name, a.line1, a.line2, a.landmark, [a.city, a.state].filter(Boolean).join(", ") + (a.pincode ? ` – ${a.pincode}` : ""), a.phone ? `Phone: ${a.phone}` : null]
    .filter((l): l is string => Boolean(l && l.trim()))
    .map(esc);
  return lines.join("<br>");
}

const PAYMENT_STATUS: Record<OrderDetail["paymentStatus"], string> = {
  pending: "Pending",
  paid: "Paid",
  cod_pending: "Pay on delivery",
  failed: "Failed",
  refunded: "Refunded",
};

function render(order: OrderDetail): string {
  const rows = order.items
    .map(
      (i, n) => `<tr>
  <td class="num">${n + 1}</td>
  <td><strong>${esc(i.name)}</strong><br><span class="muted">${esc(i.brandName)}${i.variantName && i.variantName !== "Default" ? ` · ${esc(i.variantName)}` : ""}</span></td>
  <td class="num">${i.qty}</td>
  <td class="num">${esc(formatINR(i.unitPrice))}</td>
  <td class="num">${esc(formatINR(i.lineTotal))}</td>
</tr>`,
    )
    .join("");
  const totals: Array<[string, string]> = [["Item total", formatINR(order.subtotal)]];
  if (order.itemDiscount) totals.push(["Offer discount", `−${formatINR(order.itemDiscount)}`]);
  if (order.couponDiscount) totals.push([`Coupon${order.couponCode ? ` (${order.couponCode})` : ""}`, `−${formatINR(order.couponDiscount)}`]);
  if (order.pointsDiscount) totals.push([`Points redeemed (${order.pointsRedeemed})`, `−${formatINR(order.pointsDiscount)}`]);
  totals.push(["Delivery", order.deliveryFee ? formatINR(order.deliveryFee) : "Free"]);
  if (order.codFee) totals.push(["COD fee", formatINR(order.codFee)]);
  const totalsHtml = totals.map(([k, v]) => `<tr><th>${esc(k)}</th><td class="num">${esc(v)}</td></tr>`).join("");
  const cancelled = order.status === "cancelled";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Invoice ${esc(order.orderNumber)} · GLAM</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.5 Inter, system-ui, -apple-system, "Segoe UI", sans-serif; color: #111827; background: #f9fafb; }
  .sheet { max-width: 800px; margin: 24px auto; background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px; }
  header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; border-bottom: 2px solid #db2777; padding-bottom: 16px; }
  .brand { font-size: 28px; font-weight: 800; letter-spacing: 0.08em; color: #db2777; }
  h1 { font-size: 20px; margin: 0; text-align: right; }
  .muted { color: #6b7280; font-size: 12px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 20px 0; }
  .grid h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; margin: 0 0 6px; }
  table { width: 100%; border-collapse: collapse; }
  thead th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding: 8px 6px; }
  tbody td { padding: 10px 6px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .totals { margin-left: auto; width: 320px; margin-top: 16px; }
  .totals th { text-align: left; font-weight: 500; color: #374151; padding: 4px 6px; }
  .totals td { padding: 4px 6px; }
  .totals tr.grand th, .totals tr.grand td { border-top: 1px solid #e5e7eb; font-weight: 700; font-size: 16px; padding-top: 8px; }
  .stamp { display: inline-block; padding: 2px 10px; border-radius: 24px; font-size: 12px; font-weight: 700; background: ${cancelled ? "#fee2e2" : "#dcfce7"}; color: ${cancelled ? "#dc2626" : "#15803d"}; }
  footer { margin-top: 28px; border-top: 1px solid #e5e7eb; padding-top: 12px; font-size: 12px; color: #6b7280; }
  .toolbar { max-width: 800px; margin: 16px auto 0; display: flex; justify-content: flex-end; gap: 8px; padding: 0 8px; }
  .btn { min-height: 44px; padding: 0 20px; border-radius: 24px; border: 1px solid #e5e7eb; background: #db2777; color: #fff; font-weight: 600; cursor: pointer; font-size: 14px; }
  .btn.secondary { background: #fff; color: #111827; }
  .btn:focus-visible { outline: 2px solid #db2777; outline-offset: 2px; }
  @media print {
    body { background: #fff; }
    .sheet { margin: 0; border: 0; padding: 0; max-width: none; }
    .no-print { display: none !important; }
  }
  @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } .totals { width: 100%; } .sheet { padding: 20px; } }
</style>
</head>
<body>
<div class="toolbar no-print">
  <a class="btn secondary" href="/orders/${esc(order.id)}" style="display:inline-flex;align-items:center;text-decoration:none">Back to order</a>
  <button class="btn" type="button" onclick="window.print()">Print / Save as PDF</button>
</div>
<main class="sheet">
  <header>
    <div>
      <div class="brand">GLAM</div>
      <div><strong>${esc(SELLER.name)}</strong></div>
      <div class="muted">${esc(SELLER.address)}<br>GSTIN: ${esc(SELLER.gstin)} · CIN: ${esc(SELLER.cin)}<br>${esc(SELLER.email)}</div>
    </div>
    <div>
      <h1>Tax Invoice</h1>
      <div class="muted" style="text-align:right">
        Invoice no. <strong>${esc(order.orderNumber)}</strong><br>
        Date: ${esc(formatDateTime(order.placedAt))}<br>
        Order no. ${esc(order.orderNumber)}<br>
        <span class="stamp">${cancelled ? "CANCELLED" : PAYMENT_STATUS[order.paymentStatus].toUpperCase()}</span>
      </div>
    </div>
  </header>

  <section class="grid">
    <div>
      <h2>Bill to / Ship to</h2>
      <div>${addressHtml(order.address)}</div>
      ${order.guestEmail ? `<div class="muted">${esc(order.guestEmail)}</div>` : ""}
    </div>
    <div>
      <h2>Payment</h2>
      <div>${esc(PAYMENT_METHOD_LABEL[order.paymentMethod])} · ${esc(PAYMENT_STATUS[order.paymentStatus])}</div>
      <div class="muted">Place of supply: ${esc(order.address.state ?? "India")}</div>
      ${order.awb ? `<div class="muted">Courier: ${esc(order.courier ?? "")} · AWB ${esc(order.awb)}</div>` : ""}
    </div>
  </section>

  <table aria-label="Line items">
    <thead><tr><th>#</th><th>Item</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <table class="totals" aria-label="Totals">
    ${totalsHtml}
    <tr class="grand"><th>Total</th><td class="num">${esc(formatINR(order.total))}</td></tr>
  </table>
  <p class="muted" style="text-align:right">Prices inclusive of GST.</p>

  <footer>
    This is a computer-generated invoice and does not require a signature. For help with this order, visit glam.in/help or write to ${esc(SELLER.email)}.
  </footer>
</main>
</body>
</html>`;
}

/** GET /orders/[id]/invoice — print-friendly HTML invoice for the order's owner. */
export async function GET(_req: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params;
  const order = await getOrder(id, await orderIdentity());
  if (!order) {
    return new Response("<!doctype html><title>Not found</title><p>Order not found.</p>", { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  return new Response(render(order), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}
