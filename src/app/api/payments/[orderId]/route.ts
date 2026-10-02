import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { checkoutIdentity } from "@/lib/orders/checkout-identity";
import { changePaymentMethod, confirmPayment, failPayment, getOrderForPayment } from "@/lib/orders/service";

type Ctx = { params: Promise<{ orderId: string }> };

const outcomeSchema = z.object({ outcome: z.enum(["success", "failure"]), providerRef: z.string().max(80).optional() });
const methodSchema = z.object({ method: z.enum(["upi", "card", "netbanking", "wallet", "emi", "bnpl", "cod"]) });

export const GET = handle<Ctx>(async (_req, ctx) => {
  const { orderId } = await ctx.params;
  return ok(await getOrderForPayment(z.uuid().parse(orderId), await checkoutIdentity()));
});

/** Simulated gateway callback: the shopper chooses the outcome. Ownership is checked before any state change. */
export const POST = handle<Ctx>(async (req, ctx) => {
  const { orderId } = await ctx.params;
  const id = z.uuid().parse(orderId);
  const identity = await checkoutIdentity();
  const body = await parseBody(req, outcomeSchema);
  const order = await getOrderForPayment(id, identity);
  if (order.paymentStatus === "paid" || order.paymentStatus === "cod_pending") {
    return ok({ status: order.paymentStatus, cancelled: false, attemptsLeft: 0, redirectUrl: `/orders/${id}/confirmation` });
  }
  if (body.outcome === "success") {
    return ok(await confirmPayment(id, body.providerRef ?? `sim_${Date.now().toString(36)}`));
  }
  return ok(await failPayment(id));
});

export const PATCH = handle<Ctx>(async (req, ctx) => {
  const { orderId } = await ctx.params;
  const { method } = await parseBody(req, methodSchema);
  return ok(await changePaymentMethod(z.uuid().parse(orderId), method, await checkoutIdentity()));
});
