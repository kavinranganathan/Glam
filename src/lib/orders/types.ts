import type { CartIdentity, CartView } from "@/lib/cart/types";
import type { DeliverySlot } from "@/lib/pricing/delivery";
import type { PaymentMethod, PricingResult } from "@/lib/pricing/types";
import type { Address, AddressInput, AddressSnapshot } from "./address";

/** Cart identity plus the contact email used for the payment intent / guest orders. */
export interface CheckoutIdentity extends CartIdentity {
  email?: string | null;
}

export interface QuoteOptions {
  addressId?: string | null;
  /** Used when no saved address is chosen (guest inline address, bag estimate). */
  pincode?: string | null;
  slot?: DeliverySlot;
  paymentMethod?: PaymentMethod;
  onlyItemIds?: string[] | null;
}

export interface SlotOption {
  slot: DeliverySlot;
  surcharge: number;
  /** ISO timestamp. */
  estimatedDelivery: string;
}

export interface PincodeSummary {
  pincode: string;
  serviceable: boolean;
  city: string | null;
  state: string | null;
  codAvailable: boolean;
  sameDayCutoffPassed: boolean;
}

export interface CheckoutQuote {
  /** Bag restricted to the lines being bought; pricing reflects the chosen slot and method. */
  cart: CartView;
  pricing: PricingResult;
  slot: DeliverySlot;
  slots: SlotOption[];
  /** ISO timestamp for the chosen slot. */
  estimatedDelivery: string;
  paymentMethod: PaymentMethod;
  address: Address | null;
  pincode: PincodeSummary | null;
  /** Human-readable blockers / notices (out-of-stock lines, coupon no longer valid, COD unavailable…). */
  warnings: string[];
  /** Why the chosen payment method cannot be used right now, or null. */
  paymentIssue: string | null;
  /** Whether `placeOrder` would be accepted with these inputs. */
  canPlace: boolean;
}

export interface PlaceOrderInput {
  addressId?: string | null;
  /** Inline address: required for guests, optional for users. */
  address?: AddressInput | null;
  slot: DeliverySlot;
  paymentMethod: PaymentMethod;
  onlyItemIds?: string[] | null;
  guestEmail?: string | null;
}

export interface PlaceOrderResult {
  orderId: string;
  orderNumber: string;
  redirectUrl: string;
  total: number;
  paymentMethod: PaymentMethod;
}

export type PaymentStatus = "pending" | "paid" | "cod_pending" | "failed" | "refunded";

export interface PaymentOrderView {
  id: string;
  orderNumber: string;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: string;
  paymentAttempts: number;
  attemptsLeft: number;
  deliverySlot: DeliverySlot;
  estimatedDelivery: string | null;
  itemCount: number;
  address: AddressSnapshot;
  isGuest: boolean;
  /** Which methods this order may switch to while payment is pending, with reasons for the rest. */
  methodIssues: Partial<Record<PaymentMethod, string>>;
}

export interface PaymentOutcome {
  status: PaymentStatus;
  cancelled: boolean;
  attemptsLeft: number;
  redirectUrl: string | null;
}
