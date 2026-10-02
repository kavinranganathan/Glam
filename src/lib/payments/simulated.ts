import type { PaymentIntent, PaymentIntentInput, PaymentProvider } from "./provider";

/**
 * Simulated gateway (spec §1). Redirects to the in-app `/checkout/pay/[orderId]` page which lets
 * the shopper complete or fail the payment. Replace with a Razorpay/Cashfree adapter implementing
 * the same interface once gateway keys are available.
 */
export const simulatedProvider: PaymentProvider = {
  name: "simulated",
  async createIntent(input: PaymentIntentInput): Promise<PaymentIntent> {
    const providerRef = `sim_${input.orderId.slice(0, 8)}_${Date.now().toString(36)}`;
    return { redirectUrl: `/checkout/pay/${input.orderId}`, providerRef };
  },
  async verify(payload) {
    const orderId = String(payload.orderId ?? "");
    const success = payload.outcome === "success";
    return { orderId, success, providerRef: String(payload.providerRef ?? `sim_${Date.now().toString(36)}`) };
  },
};

export function getPaymentProvider(): PaymentProvider {
  return simulatedProvider;
}
