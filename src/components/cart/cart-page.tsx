"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { useBadges } from "@/components/layout/badges-provider";
import { useCartActions } from "@/components/product/use-cart-actions";
import { track } from "@/lib/analytics/track";
import type { CartItemView, CartView } from "@/lib/cart/types";
import type { ProductCard } from "@/lib/catalogue/types";
import { CartItem } from "./cart-item";
import { CheckoutBar } from "./checkout-bar";
import { CouponBox } from "./coupon-box";
import { DeliveryEstimate } from "./delivery-estimate";
import { EmptyCart } from "./empty-cart";
import { FreeDeliveryNudge } from "./free-delivery-nudge";
import { PointsToggle } from "./points-toggle";
import { PriceSummary } from "./price-summary";
import { SavedForLater } from "./saved-for-later";
import { usePincode } from "./use-pincode";

export function CartPage({ initialCart, isLoggedIn, bestSellers, nudgeItems }: { initialCart: CartView; isLoggedIn: boolean; bestSellers: ProductCard[]; nudgeItems: ProductCard[] }) {
  const [cart, setCart] = React.useState<CartView>(initialCart);
  const [pincode, setPincode] = usePincode();
  const [confirm, setConfirm] = React.useState<CartItemView | null>(null);
  const [leaving, setLeaving] = React.useState(false);
  const actions = useCartActions();
  const badges = useBadges();
  const { toast } = useToast();
  const router = useRouter();

  const refresh = React.useCallback(
    async (pin: string | null) => {
      try {
        const res = await fetch(`/api/cart${pin ? `?pincode=${pin}` : ""}`, { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as CartView;
        setCart(next);
        badges.setCartCount(next.itemCount);
      } catch {
        // keep the current view
      }
    },
    [badges],
  );

  // The server rendered the bag without a pincode (localStorage is client-only); re-price once we know it.
  const pricedFor = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (pricedFor.current === pincode) return;
    pricedFor.current = pincode;
    if (!pincode) return;
    const t = window.setTimeout(() => void refresh(pincode), 0);
    return () => window.clearTimeout(t);
  }, [pincode, refresh]);

  /** Applies a mutation result and re-prices with the pincode (mutations price without one). */
  const apply = React.useCallback(
    async (result: Promise<CartView | null>) => {
      const next = await result;
      if (!next) return null;
      setCart(next);
      if (pincode) void refresh(pincode);
      return next;
    },
    [pincode, refresh],
  );
  const onCart = React.useCallback(
    (next: CartView) => {
      setCart(next);
      if (pincode) void refresh(pincode);
    },
    [pincode, refresh],
  );

  const remove = async (item: CartItemView) => {
    setConfirm(null);
    const next = await apply(actions.removeItem(item.id));
    if (next) track("remove_from_cart", { item_id: item.id, variant_id: item.variantId, product_id: item.productId, qty: item.qty, price: item.unitPrice });
  };

  const moveToWishlist = async (item: CartItemView) => {
    if (!isLoggedIn) {
      toast({ title: "Sign in to save items", tone: "info" });
      router.push("/login?next=/bag");
      return;
    }
    const res = await fetch("/api/wishlist/toggle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: item.productId, variantId: item.variantId }) });
    if (!res.ok) {
      toast({ title: "Couldn't move to wishlist", tone: "error" });
      return;
    }
    await apply(actions.removeItem(item.id));
    toast({ title: "Moved to wishlist", tone: "success", action: { label: "View wishlist", href: "/wishlist" } });
    void badges.refresh();
  };

  const checkout = () => {
    setLeaving(true);
    track("checkout_started", { total: cart.pricing.total, items: cart.items.length, qty: cart.itemCount, coupon: cart.couponCode, logged_in: isLoggedIn });
    router.push("/checkout");
  };

  const hasActive = cart.items.length > 0;
  const hasAnything = hasActive || cart.saved.length > 0;
  const purchasable = cart.items.filter((i) => i.maxQty > 0).length;
  const canCheckout = purchasable > 0 && purchasable === cart.items.length;
  const eta = cart.items.find((i) => i.estimatedDelivery)?.estimatedDelivery ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-4 md:pb-12 md:pt-8">
      <h1 className="font-display text-2xl font-bold text-text">
        Your Bag {hasActive && <span className="text-base font-medium text-text-tertiary">({cart.itemCount} {cart.itemCount === 1 ? "item" : "items"})</span>}
      </h1>
      {!hasAnything ? (
        <div className="mt-2">
          <EmptyCart bestSellers={bestSellers} isLoggedIn={isLoggedIn} />
        </div>
      ) : (
        <div className="mt-4 md:grid md:grid-cols-[minmax(0,1fr)_360px] md:items-start md:gap-8">
          <div className="min-w-0">
            <DeliveryEstimate pincode={pincode} onPincode={setPincode} eta={eta} deliveryLabel={cart.pricing.deliveryLabel} />
            {hasActive ? (
              <ul className="mt-2 divide-y divide-border" aria-label="Items in your bag">
                {cart.items.map((item) => (
                  <CartItem key={item.id} item={item} pending={actions.pending} onQty={(it, qty) => void apply(actions.updateItem(it.id, { qty }))} onRemove={setConfirm} onSaveForLater={(it) => void apply(actions.updateItem(it.id, { savedForLater: true }))} onMoveToWishlist={(it) => void moveToWishlist(it)} />
                ))}
              </ul>
            ) : (
              <div className="mt-4 rounded-card border border-dashed border-border p-6 text-center">
                <p className="font-semibold text-text">No items in your bag right now</p>
                <p className="mt-1 text-sm text-text-secondary">Move something back from your saved items or keep exploring.</p>
                <Button href="/" variant="outline" className="mt-3">
                  Start Shopping
                </Button>
              </div>
            )}
            {!canCheckout && hasActive && (
              <p className="mt-2 text-sm font-medium text-error" role="alert">
                Remove out-of-stock items to continue to checkout.
              </p>
            )}
            {hasActive && <FreeDeliveryNudge gap={cart.pricing.freeDeliveryGap} items={nudgeItems} />}
            <SavedForLater items={cart.saved} pending={actions.pending} onMoveToBag={(it) => void apply(actions.updateItem(it.id, { savedForLater: false }))} onRemove={(it) => void apply(actions.removeItem(it.id))} />
          </div>
          {hasActive && (
            <aside className="mt-6 flex flex-col gap-3 md:sticky md:top-20 md:mt-0">
              <CouponBox cart={cart} onCart={onCart} pincode={pincode} />
              <PointsToggle cart={cart} isLoggedIn={isLoggedIn} onCart={onCart} />
              <PriceSummary pricing={cart.pricing} couponCode={cart.couponCode} couponDescription={cart.couponDescription} isPro={cart.isPro} isLoggedIn={isLoggedIn} onRemoveCoupon={() => void apply(actions.removeCoupon())} />
              <div className="hidden md:block">
                <CheckoutBar inline total={cart.pricing.total} count={cart.itemCount} disabled={!canCheckout} loading={leaving} onCheckout={checkout} />
                {!isLoggedIn && <p className="mt-2 text-center text-xs text-text-tertiary">You&apos;ll be asked to sign in to complete your order.</p>}
              </div>
            </aside>
          )}
        </div>
      )}
      {hasActive && <CheckoutBar total={cart.pricing.total} count={cart.itemCount} disabled={!canCheckout} loading={leaving} onCheckout={checkout} />}
      <Dialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title="Remove from bag?"
        description={confirm ? `${confirm.name}${confirm.variantKind !== "default" ? ` (${confirm.variantName})` : ""} will be removed from your bag.` : undefined}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Keep
            </Button>
            <Button variant="danger" onClick={() => confirm && void remove(confirm)}>
              Remove
            </Button>
          </>
        }
      />
    </div>
  );
}
