/**
 * Read-side view models for orders and returns (Task 14). Checkout-side types live in ./types.ts.
 */
import type { OrderAction, OrderStatus } from "./state-machine";
import type { PaymentMethod } from "@/lib/pricing/types";
import type { Enums } from "@/lib/supabase/types";

export type PaymentStatus = Enums<"payment_status">;
export type DeliverySlot = Enums<"delivery_slot">;
export type ReturnStatus = Enums<"return_status">;
export type RefundMethod = Enums<"refund_method">;

/** Who is asking. Guests are identified by the `glam_session` cookie (orders.session_id). */
export interface OrderIdentity {
  user: { id: string } | null;
  sessionId: string | null;
}

/** Filter chips on /orders. Individual statuses are accepted too. */
export type OrderFilter = "all" | "active" | "delivered" | "cancelled" | "returns" | OrderStatus;

export interface OrderAddress {
  name?: string;
  phone?: string;
  line1?: string;
  line2?: string | null;
  landmark?: string | null;
  city?: string;
  state?: string;
  pincode?: string;
  label?: string;
  email?: string;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  placedAt: string;
  total: number;
  itemCount: number;
  firstImage: string | null;
  firstName: string;
  /** Up to 3 item images for the stacked thumbnail. */
  images: string[];
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  estimatedDelivery: string | null;
}

export interface OrderItemView {
  id: string;
  productId: string | null;
  variantId: string | null;
  slug: string;
  name: string;
  brandName: string;
  variantName: string;
  image: string | null;
  qty: number;
  unitPrice: number;
  mrp: number;
  lineTotal: number;
  returnedQty: number;
  nonReturnable: boolean;
  returnWindowDays: number;
  categoryRoot: string;
  reviewed: boolean;
}

export interface OrderEventView {
  status: OrderStatus;
  note: string | null;
  at: string;
}

export interface OrderReturnRef {
  id: string;
  status: ReturnStatus;
  createdAt: string;
  refundAmount: number;
  refundMethod: RefundMethod;
}

export interface OrderDetail extends OrderSummary {
  userId: string | null;
  sessionId: string | null;
  guestEmail: string | null;
  items: OrderItemView[];
  address: OrderAddress;
  subtotal: number;
  itemDiscount: number;
  couponCode: string | null;
  couponDiscount: number;
  pointsRedeemed: number;
  pointsDiscount: number;
  deliveryFee: number;
  codFee: number;
  deliverySlot: DeliverySlot;
  courier: string | null;
  awb: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  events: OrderEventView[];
  returns: OrderReturnRef[];
  actions: OrderAction[];
}

export interface ReturnItemView {
  orderItemId: string;
  name: string;
  brandName: string;
  image: string | null;
  qty: number;
  variantName: string;
}

export interface ReturnEventView {
  status: ReturnStatus;
  note: string | null;
  at: string;
}

export interface ReturnDetail {
  id: string;
  orderId: string;
  orderNumber: string;
  status: ReturnStatus;
  reason: string;
  comment: string | null;
  refundMethod: RefundMethod;
  photos: string[];
  awb: string | null;
  refundAmount: number;
  pickupAddress: OrderAddress;
  pickupScheduledFor: string | null;
  refundedAt: string | null;
  createdAt: string;
  items: ReturnItemView[];
  events: ReturnEventView[];
  refundEta: string;
}

export interface ReturnSummary {
  id: string;
  orderId: string;
  orderNumber: string;
  status: ReturnStatus;
  refundAmount: number;
  createdAt: string;
  itemCount: number;
  firstImage: string | null;
}

/** Eligibility of one order item for return, computed client- and server-side. */
export type IneligibleReason = "non_returnable" | "window_closed" | "already_returned" | "not_delivered";

export interface ReturnableItemState {
  orderItemId: string;
  eligible: boolean;
  reason: IneligibleReason | null;
  deadline: string | null;
  /** Units that can still be returned (qty − returnedQty). */
  remainingQty: number;
}

export interface ReturnPayloadInput {
  items: Array<{ order_item_id: string; qty: number }>;
  reason: string;
  comment?: string | null;
  refund_method: RefundMethod;
  photos?: string[];
  pickup_address?: OrderAddress | null;
}
