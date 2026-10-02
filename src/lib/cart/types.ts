import type { PricingResult } from "@/lib/pricing/types";

export interface CartItemView {
  id: string;
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  brandName: string;
  variantName: string;
  variantKind: "default" | "shade" | "size";
  shadeHex: string | null;
  image: string;
  qty: number;
  unitPrice: number;
  mrp: number;
  lineTotal: number;
  priceSource: "base" | "pro" | "flash";
  offerLabel: string | null;
  stock: number;
  /** Highest quantity the shopper may set: min(10, stock). 0 when out of stock. */
  maxQty: number;
  savedForLater: boolean;
  nonReturnable: boolean;
  /** ISO timestamp of the standard-slot estimate for the supplied pincode; null when no pincode. */
  estimatedDelivery: string | null;
}

export interface CartView {
  id: string;
  items: CartItemView[];
  saved: CartItemView[];
  pricing: PricingResult;
  couponCode: string | null;
  couponDescription: string | null;
  usePoints: boolean;
  pointsBalance: number;
  /** Sum of quantities in the active (not saved-for-later) list. */
  itemCount: number;
  isPro: boolean;
  tier: string;
}

export interface CartIdentity {
  user: { id: string } | null;
  sessionId: string;
}

export interface AvailableCouponView {
  code: string;
  description: string;
  kind: "percent" | "flat" | "free_delivery";
  value: number;
  maxDiscount: number | null;
  minOrder: number;
  endsAt: string | null;
  proOnly: boolean;
  eligible: boolean;
  reason: string | null;
}
