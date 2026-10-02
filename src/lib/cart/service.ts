import "server-only";

import { ApiError } from "@/lib/api/respond";
import { tierForSpend } from "@/lib/loyalty/tiers";
import { describeCoupon } from "@/lib/pricing/coupons";
import { estimatedDelivery } from "@/lib/pricing/delivery";
import { priceCart } from "@/lib/pricing/engine";
import type { CouponRecord, PaymentMethod, PincodeRecord, PricingContext, PricingLineInput, PricingResult, Tier } from "@/lib/pricing/types";
import { serviceClient } from "@/lib/supabase/service";
import type { Inserts, Tables } from "@/lib/supabase/types";
import { buildCategoryPath, effectiveQty, MAX_LINE_QTY, maxQtyFor, normaliseCouponCode, type CategoryNode } from "./rules";
import type { AvailableCouponView, CartIdentity, CartItemView, CartView } from "./types";

export interface CartViewOptions {
  pincode?: string;
  paymentMethod?: PaymentMethod | null;
  /** `null` prices the cart without a coupon; `undefined` uses the cart's stored code. */
  couponOverride?: string | null;
  usePointsOverride?: boolean;
}

/* ------------------------------------------------------------------------------------------------
 * Cart row
 * ---------------------------------------------------------------------------------------------- */

/** The identity's cart, created on first use. Users are keyed by user_id, guests by session cookie. */
export async function getOrCreateCart(identity: CartIdentity): Promise<Tables<"carts">> {
  const db = serviceClient();
  const existing = await findCart(identity);
  if (existing) return existing;

  const insert: Inserts<"carts"> = identity.user ? { user_id: identity.user.id } : { session_id: identity.sessionId };
  const { data, error } = await db.from("carts").insert(insert).select("*").single();
  if (data) return data;
  // Unique violation: a concurrent request created it first.
  if (error?.code === "23505") {
    const raced = await findCart(identity);
    if (raced) return raced;
  }
  throw new ApiError(500, "CART_UNAVAILABLE", "Could not open your bag. Please try again.");
}

async function findCart(identity: CartIdentity): Promise<Tables<"carts"> | null> {
  const db = serviceClient();
  const q = db.from("carts").select("*");
  const { data, error } = identity.user
    ? await q.eq("user_id", identity.user.id).maybeSingle()
    : await q.eq("session_id", identity.sessionId).maybeSingle();
  if (error) throw new ApiError(500, "CART_UNAVAILABLE", "Could not open your bag. Please try again.");
  return data;
}

/* ------------------------------------------------------------------------------------------------
 * Loading
 * ---------------------------------------------------------------------------------------------- */

const CART_ITEM_SELECT = `id, cart_id, variant_id, qty, saved_for_later, created_at,
  variants!inner(id, product_id, sku, name, kind, shade_hex, price, mrp, stock, is_default,
    products!inner(id, slug, name, brand_id, category_id, images, price, mrp, pro_price,
      offer_type, offer_buy, offer_get, non_returnable, is_active,
      brands(name)))` as const;

type CartItemRow = Tables<"cart_items"> & {
  variants: Pick<Tables<"variants">, "id" | "product_id" | "sku" | "name" | "kind" | "shade_hex" | "price" | "mrp" | "stock" | "is_default"> & {
    products: Pick<
      Tables<"products">,
      "id" | "slug" | "name" | "brand_id" | "category_id" | "images" | "price" | "mrp" | "pro_price" | "offer_type" | "offer_buy" | "offer_get" | "non_returnable" | "is_active"
    > & { brands: { name: string } | null };
  };
};

interface ShopperProfile {
  isPro: boolean;
  tier: Tier;
  pointsBalance: number;
}

const GUEST_PROFILE: ShopperProfile = { isPro: false, tier: "base", pointsBalance: 0 };

interface CartContext {
  cart: Tables<"carts">;
  rows: CartItemRow[];
  /** Pricing inputs for active, in-stock lines only (saved and out-of-stock lines are not priced). */
  lines: PricingLineInput[];
  profile: ShopperProfile;
  pincode: PincodeRecord | null;
  paymentMethod: PaymentMethod | null;
  coupon: CouponRecord | null;
  couponUserUses: number;
  usePoints: boolean;
  couponCode: string | null;
}

async function loadCartContext(identity: CartIdentity, opts: CartViewOptions = {}): Promise<CartContext> {
  const db = serviceClient();
  const cart = await getOrCreateCart(identity);

  const couponCode = opts.couponOverride === undefined ? cart.coupon_code : opts.couponOverride;
  const usePoints = opts.usePointsOverride ?? cart.use_points;

  const [itemsRes, profile, pincode, coupon] = await Promise.all([
    db.from("cart_items").select(CART_ITEM_SELECT).eq("cart_id", cart.id).order("created_at", { ascending: true }),
    loadShopperProfile(identity),
    opts.pincode ? loadPincode(opts.pincode) : Promise.resolve(null),
    couponCode ? findCoupon(couponCode, identity) : Promise.resolve(null),
  ]);
  if (itemsRes.error) throw new ApiError(500, "CART_UNAVAILABLE", "Could not load your bag. Please try again.");
  const rows = itemsRes.data as unknown as CartItemRow[];

  const productIds = [...new Set(rows.map((r) => r.variants.products.id))];
  const [flashPrices, categories, couponUserUses] = await Promise.all([
    loadFlashPrices(productIds),
    loadCategories(),
    coupon && identity.user ? countRedemptions(coupon.id, identity.user.id) : Promise.resolve(0),
  ]);

  const lines: PricingLineInput[] = [];
  for (const r of rows) {
    if (r.saved_for_later) continue;
    const qty = effectiveQty(r.qty, r.variants.stock);
    if (qty === 0) continue; // out of stock: shown, not priced
    const p = r.variants.products;
    lines.push({
      cartItemId: r.id,
      variantId: r.variants.id,
      productId: p.id,
      sku: r.variants.sku,
      qty,
      price: r.variants.price,
      mrp: r.variants.mrp,
      proPrice: p.pro_price,
      flashPrice: flashPrices.get(p.id) ?? null,
      offerType: p.offer_type,
      offerBuy: p.offer_buy,
      offerGet: p.offer_get,
      brandId: p.brand_id,
      categoryId: p.category_id,
      categoryPath: buildCategoryPath(p.category_id, categories),
    });
  }

  return {
    cart,
    rows,
    lines,
    profile,
    pincode,
    paymentMethod: opts.paymentMethod ?? null,
    coupon: coupon ? toCouponRecord(coupon) : null,
    couponUserUses,
    usePoints: Boolean(usePoints && identity.user),
    couponCode: couponCode ? normaliseCouponCode(couponCode) : null,
  };
}

function pricingContext(c: CartContext, coupon: CouponRecord | null, couponUserUses: number): PricingContext {
  return {
    isPro: c.profile.isPro,
    tier: c.profile.tier,
    pointsBalance: c.profile.pointsBalance,
    usePoints: c.usePoints,
    coupon,
    couponUserUses,
    pincode: c.pincode,
    paymentMethod: c.paymentMethod,
  };
}

/**
 * Loyalty tier for pricing. The SQL side (`award_points`) derives the tier from a rolling 12-month
 * paid spend; `profiles.lifetime_spend` is the app-side approximation used for display and quotes.
 */
async function loadShopperProfile(identity: CartIdentity): Promise<ShopperProfile> {
  if (!identity.user) return GUEST_PROFILE;
  const { data } = await serviceClient().from("profiles").select("pro_until, points_balance, lifetime_spend").eq("id", identity.user.id).maybeSingle();
  if (!data) return GUEST_PROFILE;
  return {
    isPro: Boolean(data.pro_until && new Date(data.pro_until) > new Date()),
    tier: tierForSpend(data.lifetime_spend),
    pointsBalance: data.points_balance,
  };
}

async function loadPincode(pincode: string): Promise<PincodeRecord | null> {
  const { data } = await serviceClient().from("pincodes").select("*").eq("pincode", pincode).maybeSingle();
  return data;
}

/** Lowest live flash-sale price per product for the given products. */
async function loadFlashPrices(productIds: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  if (productIds.length === 0) return prices;
  const db = serviceClient();
  const nowIso = new Date().toISOString();
  const { data: sales } = await db.from("flash_sales").select("id").eq("is_active", true).lte("starts_at", nowIso).gte("ends_at", nowIso);
  const saleIds = (sales ?? []).map((s) => s.id);
  if (saleIds.length === 0) return prices;
  const { data: items } = await db.from("flash_sale_items").select("product_id, sale_price").in("flash_sale_id", saleIds).in("product_id", productIds);
  for (const it of items ?? []) {
    const cur = prices.get(it.product_id);
    if (cur === undefined || it.sale_price < cur) prices.set(it.product_id, it.sale_price);
  }
  return prices;
}

async function loadCategories(): Promise<Map<string, CategoryNode>> {
  const { data } = await serviceClient().from("categories").select("id, parent_id");
  return new Map((data ?? []).map((c) => [c.id, c]));
}

/** Coupon by code (case-insensitive) that this identity may see: public, or personal to this user. */
async function findCoupon(code: string, identity: CartIdentity): Promise<Tables<"coupons"> | null> {
  const pattern = code.trim().replace(/[\\%_]/g, (m) => `\\${m}`);
  if (!pattern) return null;
  const { data } = await serviceClient().from("coupons").select("*").ilike("code", pattern).limit(1).maybeSingle();
  if (!data) return null;
  if (data.user_id && data.user_id !== identity.user?.id) return null;
  return data;
}

async function countRedemptions(couponId: string, userId: string): Promise<number> {
  const { count } = await serviceClient().from("coupon_redemptions").select("id", { count: "exact", head: true }).eq("coupon_id", couponId).eq("user_id", userId);
  return count ?? 0;
}

function toCouponRecord(c: Tables<"coupons">): CouponRecord {
  return {
    code: c.code,
    kind: c.kind,
    value: c.value,
    max_discount: c.max_discount,
    min_order: c.min_order,
    scope: c.scope,
    scope_id: c.scope_id,
    user_id: c.user_id,
    starts_at: c.starts_at,
    ends_at: c.ends_at,
    usage_limit: c.usage_limit,
    used_count: c.used_count,
    per_user_limit: c.per_user_limit,
    pro_only: c.pro_only,
    is_active: c.is_active,
    description: c.description,
  };
}

/* ------------------------------------------------------------------------------------------------
 * View
 * ---------------------------------------------------------------------------------------------- */

export async function getCartView(identity: CartIdentity, opts: CartViewOptions = {}): Promise<CartView> {
  const c = await loadCartContext(identity, opts);
  const pricing = priceCart(c.lines, pricingContext(c, c.coupon, c.couponUserUses));
  return buildView(c, pricing);
}

function buildView(c: CartContext, pricing: PricingResult): CartView {
  const priced = new Map(pricing.lines.map((l) => [l.cartItemId, l]));
  const eta = c.pincode ? estimatedDelivery("standard", c.pincode).toISOString() : null;
  const items: CartItemView[] = [];
  const saved: CartItemView[] = [];

  for (const r of c.rows) {
    const v = r.variants;
    const p = v.products;
    const line = priced.get(r.id);
    const qty = r.saved_for_later ? r.qty : effectiveQty(r.qty, v.stock) || r.qty;
    const view: CartItemView = {
      id: r.id,
      variantId: v.id,
      productId: p.id,
      slug: p.slug,
      name: p.name,
      brandName: p.brands?.name ?? "",
      variantName: v.name,
      variantKind: v.kind,
      shadeHex: v.shade_hex,
      image: p.images[0] ?? "",
      qty,
      unitPrice: line?.unitPrice ?? v.price,
      mrp: v.mrp,
      lineTotal: line?.lineTotal ?? 0,
      priceSource: line?.priceSource ?? "base",
      offerLabel: line?.offerLabel ?? null,
      stock: v.stock,
      maxQty: maxQtyFor(v.stock),
      savedForLater: r.saved_for_later,
      nonReturnable: p.non_returnable,
      estimatedDelivery: eta,
    };
    (r.saved_for_later ? saved : items).push(view);
  }

  // Keep the stored code visible even when the engine rejected it, so the UI can show the reason.
  const couponCode = c.couponCode;
  return {
    id: c.cart.id,
    items,
    saved,
    pricing,
    couponCode,
    couponDescription: c.coupon ? describeCoupon(c.coupon) : null,
    usePoints: c.usePoints,
    pointsBalance: c.profile.pointsBalance,
    itemCount: items.reduce((s, i) => s + i.qty, 0),
    isPro: c.profile.isPro,
    tier: c.profile.tier,
  };
}

/* ------------------------------------------------------------------------------------------------
 * Mutations
 * ---------------------------------------------------------------------------------------------- */

export async function addItem(identity: CartIdentity, variantId: string, qty = 1): Promise<CartView> {
  const db = serviceClient();
  const cart = await getOrCreateCart(identity);
  const { data: variant } = await db.from("variants").select("id, stock, name, products!inner(is_active)").eq("id", variantId).maybeSingle();
  if (!variant || !variant.products.is_active) throw new ApiError(404, "VARIANT_NOT_FOUND", "This item is no longer available.");
  if (variant.stock <= 0) throw new ApiError(409, "OUT_OF_STOCK", `Sorry, ${variant.name} is out of stock.`);

  const { data: existing } = await db.from("cart_items").select("id, qty, saved_for_later").eq("cart_id", cart.id).eq("variant_id", variantId).maybeSingle();
  const want = Math.max(1, Math.floor(qty));
  const nextQty = Math.max(1, effectiveQty((existing?.qty ?? 0) + want, variant.stock));

  const { error } = existing
    ? await db.from("cart_items").update({ qty: nextQty, saved_for_later: false }).eq("id", existing.id)
    : await db.from("cart_items").insert({ cart_id: cart.id, variant_id: variantId, qty: nextQty });
  if (error) throw new ApiError(500, "CART_UNAVAILABLE", "Could not add this item. Please try again.");
  return getCartView(identity);
}

export async function updateItem(identity: CartIdentity, itemId: string, patch: { qty?: number; savedForLater?: boolean }): Promise<CartView> {
  const db = serviceClient();
  const cart = await getOrCreateCart(identity);
  const item = await ownedItem(cart.id, itemId);

  const update: { qty?: number; saved_for_later?: boolean } = {};
  if (patch.qty !== undefined) {
    const want = Math.floor(patch.qty);
    if (want < 1 || want > MAX_LINE_QTY) {
      throw new ApiError(422, "QTY_INVALID", `Quantity must be between 1 and ${MAX_LINE_QTY}.`);
    }
    const stock = item.variants.stock;
    if (stock <= 0) throw new ApiError(409, "OUT_OF_STOCK", "This item is out of stock.");
    update.qty = effectiveQty(want, stock);
  }
  if (patch.savedForLater !== undefined) update.saved_for_later = patch.savedForLater;

  if (Object.keys(update).length > 0) {
    const { error } = await db.from("cart_items").update(update).eq("id", item.id);
    if (error) throw new ApiError(500, "CART_UNAVAILABLE", "Could not update this item. Please try again.");
  }
  return getCartView(identity);
}

export async function removeItem(identity: CartIdentity, itemId: string): Promise<CartView> {
  const cart = await getOrCreateCart(identity);
  const item = await ownedItem(cart.id, itemId);
  const { error } = await serviceClient().from("cart_items").delete().eq("id", item.id);
  if (error) throw new ApiError(500, "CART_UNAVAILABLE", "Could not remove this item. Please try again.");
  return getCartView(identity);
}

/** Cart item by id, guaranteed to belong to this cart. 404 otherwise (never leaks other carts). */
async function ownedItem(cartId: string, itemId: string) {
  const { data } = await serviceClient().from("cart_items").select("id, qty, saved_for_later, variants!inner(stock)").eq("id", itemId).eq("cart_id", cartId).maybeSingle();
  if (!data) throw new ApiError(404, "ITEM_NOT_FOUND", "Item not found in your bag.");
  return data;
}

/**
 * Applies a coupon to the cart. Existence and `is_active` are checked here; every other rule
 * (dates, limits, scope, min order, Pro-only) comes from the pricing engine. The candidate is priced
 * first and only stored when it applies cleanly, so a rejected code never disturbs a coupon that is
 * already on the cart; the rejection surfaces as 422 COUPON_INVALID with the engine's message.
 */
export async function applyCoupon(identity: CartIdentity, code: string): Promise<CartView> {
  const coupon = await findCoupon(code, identity);
  if (!coupon || !coupon.is_active) throw new ApiError(422, "COUPON_INVALID", "Invalid coupon code.");

  const stored = normaliseCouponCode(coupon.code);
  const view = await getCartView(identity, { couponOverride: stored });
  if (view.pricing.couponError) throw new ApiError(422, "COUPON_INVALID", view.pricing.couponError);

  const { error } = await serviceClient().from("carts").update({ coupon_code: stored }).eq("id", view.id);
  if (error) throw new ApiError(500, "CART_UNAVAILABLE", "Could not apply the coupon. Please try again.");
  return view;
}

export async function removeCoupon(identity: CartIdentity): Promise<CartView> {
  const cart = await getOrCreateCart(identity);
  const { error } = await serviceClient().from("carts").update({ coupon_code: null }).eq("id", cart.id);
  if (error) throw new ApiError(500, "CART_UNAVAILABLE", "Could not remove the coupon. Please try again.");
  return getCartView(identity);
}

export async function setUsePoints(identity: CartIdentity, use: boolean): Promise<CartView> {
  if (!identity.user) throw new ApiError(401, "UNAUTHENTICATED", "Sign in to redeem GLAM points.");
  const cart = await getOrCreateCart(identity);
  const { error } = await serviceClient().from("carts").update({ use_points: use }).eq("id", cart.id);
  if (error) throw new ApiError(500, "CART_UNAVAILABLE", "Could not update points redemption. Please try again.");
  return getCartView(identity);
}

/** Empties the bag (active and saved lines) and resets coupon / points choices. */
export async function clearCart(identity: CartIdentity): Promise<CartView> {
  const db = serviceClient();
  const cart = await getOrCreateCart(identity);
  const [items, reset] = await Promise.all([
    db.from("cart_items").delete().eq("cart_id", cart.id),
    db.from("carts").update({ coupon_code: null, use_points: false }).eq("id", cart.id),
  ]);
  if (items.error || reset.error) throw new ApiError(500, "CART_UNAVAILABLE", "Could not clear your bag. Please try again.");
  return getCartView(identity);
}

/** Sum of quantities in the active list; one cheap query, no cart creation for empty guests. */
export async function getCartCount(identity: CartIdentity): Promise<number> {
  const cart = await findCart(identity);
  if (!cart) return 0;
  const { data } = await serviceClient().from("cart_items").select("qty").eq("cart_id", cart.id).eq("saved_for_later", false);
  return (data ?? []).reduce((s, r) => s + r.qty, 0);
}

/* ------------------------------------------------------------------------------------------------
 * Coupon browser
 * ---------------------------------------------------------------------------------------------- */

/**
 * Public coupons plus the user's personal ones, each priced against the current cart so the UI can
 * show "Apply" or the reason it does not apply yet.
 */
export async function getAvailableCoupons(identity: CartIdentity, opts: CartViewOptions = {}): Promise<AvailableCouponView[]> {
  const db = serviceClient();
  const [c, couponsRes] = await Promise.all([
    loadCartContext(identity, { ...opts, couponOverride: null }),
    identity.user
      ? db.from("coupons").select("*").eq("is_active", true).or(`user_id.is.null,user_id.eq.${identity.user.id}`).order("min_order", { ascending: true })
      : db.from("coupons").select("*").eq("is_active", true).is("user_id", null).order("min_order", { ascending: true }),
  ]);
  const now = new Date();
  const coupons = (couponsRes.data ?? []).filter((k) => !k.ends_at || new Date(k.ends_at) >= now);

  const uses = new Map<string, number>();
  if (identity.user && coupons.length > 0) {
    const { data } = await db.from("coupon_redemptions").select("coupon_id").eq("user_id", identity.user.id).in("coupon_id", coupons.map((k) => k.id));
    for (const r of data ?? []) uses.set(r.coupon_id, (uses.get(r.coupon_id) ?? 0) + 1);
  }

  return coupons.map((k) => {
    const record = toCouponRecord(k);
    const result = priceCart(c.lines, pricingContext(c, record, uses.get(k.id) ?? 0));
    const emptyBag = c.lines.length === 0;
    return {
      code: k.code,
      description: describeCoupon(record),
      kind: k.kind,
      value: k.value,
      maxDiscount: k.max_discount,
      minOrder: k.min_order,
      endsAt: k.ends_at,
      proOnly: k.pro_only,
      eligible: !emptyBag && result.couponError === null,
      reason: emptyBag ? "Add items to your bag to use this coupon." : result.couponError,
    };
  });
}
