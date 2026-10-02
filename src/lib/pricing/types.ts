export type Tier = "base" | "silver" | "gold" | "platinum";

export type PaymentMethod = "upi" | "card" | "netbanking" | "wallet" | "emi" | "bnpl" | "cod" | "giftcard";

export type CouponKind = "percent" | "flat" | "free_delivery";
export type CouponScope = "all" | "brand" | "category";

export interface CouponRecord {
  code: string;
  kind: CouponKind;
  value: number; // percent (0-100) or flat paise
  max_discount: number | null;
  min_order: number;
  scope: CouponScope;
  scope_id: string | null;
  user_id: string | null;
  starts_at: string;
  ends_at: string | null;
  usage_limit: number | null;
  used_count: number;
  per_user_limit: number;
  pro_only: boolean;
  is_active: boolean;
  description: string;
}

export interface PincodeRecord {
  pincode: string;
  city: string;
  state: string;
  same_day: boolean;
  next_day: boolean;
  delivery_fee: number;
  cod_available: boolean;
  standard_days: number;
  courier: string;
}

export interface PricingLineInput {
  cartItemId?: string;
  variantId: string;
  productId: string;
  sku: string;
  qty: number;
  price: number;
  mrp: number;
  proPrice: number | null;
  flashPrice: number | null;
  offerType: "none" | "bxgy";
  offerBuy: number;
  offerGet: number;
  brandId: string;
  categoryId: string;
  /** Category id chain from the leaf up to the root, used for category-scoped coupons. */
  categoryPath: string[];
}

export interface PricingContext {
  isPro: boolean;
  tier: Tier;
  pointsBalance: number;
  usePoints: boolean;
  coupon: CouponRecord | null;
  /** How many times this user has already redeemed the coupon. */
  couponUserUses: number;
  pincode: PincodeRecord | null;
  paymentMethod: PaymentMethod | null;
  now?: Date;
}

export interface PricingLine {
  cartItemId?: string;
  variantId: string;
  qty: number;
  unitPrice: number;
  mrp: number;
  lineTotal: number;
  lineDiscount: number;
  priceSource: "base" | "pro" | "flash";
  offerLabel: string | null;
}

export interface PricingResult {
  lines: PricingLine[];
  /** Sum of unitPrice × qty before offers. */
  subtotal: number;
  /** Buy-X-Get-Y and similar item-level discounts. */
  itemDiscount: number;
  couponCode: string | null;
  couponDiscount: number;
  couponError: string | null;
  pointsRedeemed: number;
  pointsDiscount: number;
  deliveryFee: number;
  deliveryLabel: string;
  codFee: number;
  tax: number;
  total: number;
  pointsToEarn: number;
  /** Savings versus MRP, including Pro pricing and offers. */
  totalSavings: number;
  proSavings: number;
  /** Paise still needed to reach free delivery (0 when free). */
  freeDeliveryGap: number;
}
