import type { PaymentMethod } from "@/lib/pricing/types";

export interface PaymentIntentInput {
  orderId: string;
  orderNumber: string;
  amount: number; // paise
  method: PaymentMethod;
  customerEmail: string | null;
}

export interface PaymentIntent {
  /** Where the browser should go to complete payment (hosted page or in-app simulated gateway). */
  redirectUrl: string;
  providerRef: string;
}

export interface PaymentProvider {
  readonly name: string;
  createIntent(input: PaymentIntentInput): Promise<PaymentIntent>;
  /** Verifies a provider callback/webhook payload and returns the outcome. */
  verify(payload: Record<string, unknown>): Promise<{ orderId: string; success: boolean; providerRef: string }>;
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  upi: "UPI",
  card: "Credit / Debit Card",
  netbanking: "Net Banking",
  wallet: "Wallets",
  emi: "EMI",
  bnpl: "Pay Later",
  cod: "Cash on Delivery",
  giftcard: "GLAM Gift Card",
};

export const PAYMENT_METHODS_ORDERED: PaymentMethod[] = ["upi", "card", "netbanking", "wallet", "emi", "bnpl", "cod"];

export const UPI_APPS = ["Google Pay", "PhonePe", "Paytm", "BHIM", "Any UPI ID"];
export const BANKS = ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra", "Yes Bank", "IndusInd", "Punjab National Bank", "Bank of Baroda", "Canara Bank", "Union Bank", "IDFC First", "Federal Bank", "RBL Bank", "Standard Chartered"];
export const WALLETS = ["Paytm", "Amazon Pay", "Freecharge", "Mobikwik"];
export const BNPL_PROVIDERS = ["Simpl", "LazyPay", "ZestMoney"];
export const EMI_TENURES = [3, 6, 9, 12];

/** EMI is offered on orders ≥ ₹3,000 (card networks' usual floor). */
export const EMI_MIN_PAISE = 3000 * 100;

export function emiMonthly(amountPaise: number, months: number, annualRate = 0.15): number {
  const r = annualRate / 12;
  const emi = (amountPaise * r) / (1 - Math.pow(1 + r, -months));
  return Math.round(emi);
}
