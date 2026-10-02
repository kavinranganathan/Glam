"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CouponBox } from "@/components/cart/coupon-box";
import { PointsToggle } from "@/components/cart/points-toggle";
import { useToast } from "@/components/ui/toast";
import { track } from "@/lib/analytics/track";
import type { Address, AddressInput } from "@/lib/orders/address";
import { GuestDetails } from "./guest-details";
import type { CheckoutQuote, PlaceOrderResult } from "@/lib/orders/types";
import type { DeliverySlot } from "@/lib/pricing/delivery";
import type { PaymentMethod } from "@/lib/pricing/types";
import { AddressList } from "./address-list";
import { OrderSummary } from "./order-summary";
import { PaymentMethods } from "./payment-methods";
import { PlaceOrderBar } from "./place-order-bar";
import { ReviewItems } from "./review-items";
import { SlotPicker } from "./slot-picker";

interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

export function CheckoutPage({
  initialQuote,
  initialAddresses,
  buyNowItemIds,
  isGuest = false,
}: {
  initialQuote: CheckoutQuote;
  initialAddresses: Address[];
  buyNowItemIds: string[] | null;
  isGuest?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [quote, setQuote] = React.useState(initialQuote);
  const [guestEmail, setGuestEmail] = React.useState("");
  const [guestAddress, setGuestAddress] = React.useState<AddressInput | null>(null);
  const guestAddressRef = React.useRef<AddressInput | null>(null);
  const [addresses, setAddresses] = React.useState(initialAddresses);
  const [addressId, setAddressId] = React.useState<string | null>(initialQuote.address?.id ?? null);
  const [slot, setSlot] = React.useState<DeliverySlot>(initialQuote.slot);
  const [method, setMethod] = React.useState<PaymentMethod>(initialQuote.paymentMethod);
  const [quoting, setQuoting] = React.useState(false);
  const [placing, setPlacing] = React.useState(false);
  const seq = React.useRef(0);

  React.useEffect(() => {
    track("checkout_started", { total: initialQuote.pricing.total, items: initialQuote.cart.items.length, buy_now: Boolean(buyNowItemIds) });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once on mount
  }, []);

  const requote = React.useCallback(
    async (next: { addressId: string | null; slot: DeliverySlot; method: PaymentMethod }) => {
      const id = ++seq.current;
      setQuoting(true);
      try {
        const res = await fetch("/api/checkout/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            addressId: next.addressId,
            pincode: guestAddressRef.current?.pincode ?? null,
            slot: next.slot,
            paymentMethod: next.method,
            onlyItemIds: buyNowItemIds,
          }),
        });
        if (id !== seq.current) return;
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
          toast({ title: body?.error?.message ?? "Couldn't update your order summary", tone: "error" });
          return;
        }
        const q = (await res.json()) as CheckoutQuote;
        setQuote(q);
        if (q.slot !== next.slot) setSlot(q.slot);
      } catch {
        if (id === seq.current) toast({ title: "Network error. Please try again.", tone: "error" });
      } finally {
        if (id === seq.current) setQuoting(false);
      }
    },
    [buyNowItemIds, toast],
  );

  const update = (patch: Partial<{ addressId: string | null; slot: DeliverySlot; method: PaymentMethod }>) => {
    const next = { addressId, slot, method, ...patch };
    if (patch.addressId !== undefined) setAddressId(patch.addressId);
    if (patch.slot !== undefined) setSlot(patch.slot);
    if (patch.method !== undefined) setMethod(patch.method);
    void requote(next);
  };

  const reloadAddresses = async () => {
    const res = await fetch("/api/addresses", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { addresses: Address[] };
    setAddresses(data.addresses);
    if (addressId && !data.addresses.some((a) => a.id === addressId)) {
      update({ addressId: data.addresses.find((a) => a.isDefault)?.id ?? data.addresses[0]?.id ?? null });
    } else if (addressId) {
      void requote({ addressId, slot, method }); // pincode may have changed on edit
    }
  };

  const setGuest = (input: AddressInput) => {
    guestAddressRef.current = input;
    setGuestAddress(input);
    void requote({ addressId: null, slot, method });
  };

  const hasAddress = isGuest ? Boolean(guestAddress) : Boolean(addressId);
  const guestEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim());

  const place = async () => {
    if (isGuest && !guestEmailValid) {
      toast({ title: "Enter your email for order updates", tone: "warning" });
      document.getElementById("checkout-address")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (!hasAddress) {
      toast({ title: "Choose a delivery address", tone: "warning" });
      document.getElementById("checkout-address")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setPlacing(true);
    try {
      const res = await fetch("/api/checkout/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isGuest
            ? { address: guestAddress, guestEmail: guestEmail.trim(), slot, paymentMethod: method, onlyItemIds: buyNowItemIds }
            : { addressId, slot, paymentMethod: method, onlyItemIds: buyNowItemIds },
        ),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
        const code = body?.error?.code;
        toast({ title: body?.error?.message ?? "Couldn't place your order", tone: "error", action: code === "OUT_OF_STOCK" || code === "EMPTY_ORDER" ? { label: "Go to bag", href: "/bag" } : undefined, durationMs: 6000 });
        void requote({ addressId, slot, method });
        return;
      }
      const placed = (await res.json()) as PlaceOrderResult;
      track("payment_initiated", { order_id: placed.orderId, order_number: placed.orderNumber, method: placed.paymentMethod, total: placed.total });
      router.push(placed.redirectUrl);
    } catch {
      toast({ title: "Network error. Please try again.", tone: "error" });
      setPlacing(false);
    }
  };

  const issues = React.useMemo(() => {
    const out: Partial<Record<PaymentMethod, string>> = {};
    if (quote.paymentIssue) out[method] = quote.paymentIssue;
    const q = quote.pincode;
    if (!q?.serviceable) out.cod = out.cod ?? "Add a serviceable delivery address to pay on delivery.";
    else if (!q.codAvailable) out.cod = out.cod ?? "Cash on Delivery is not available for this pincode.";
    return out;
  }, [quote, method]);

  const blocker = !hasAddress
    ? isGuest
      ? "Add your delivery address to continue."
      : "Choose a delivery address to continue."
    : isGuest && !guestEmailValid
      ? "Enter your email for order updates."
      : (quote.paymentIssue ?? (quote.canPlace ? null : (quote.warnings[0] ?? "Please review the items in your bag.")));
  const canPlace = hasAddress && (!isGuest || guestEmailValid) && quote.canPlace && !quoting;
  const pincode = quote.address?.pincode ?? guestAddress?.pincode ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-4 md:pt-8 lg:pb-12">
      <h1 className="font-display text-2xl font-bold text-text">Checkout</h1>
      <div className="mt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <Step n={1} title="Review items">
            <ReviewItems items={quote.cart.items} buyNow={Boolean(buyNowItemIds)} />
          </Step>
          <Step n={2} title="Delivery address" id="checkout-address">
            {isGuest ? (
              <GuestDetails email={guestEmail} onEmail={setGuestEmail} address={guestAddress} onAddress={setGuest} />
            ) : (
              <AddressList addresses={addresses} selectedId={addressId} onSelect={(id) => update({ addressId: id })} onChanged={() => void reloadAddresses()} mode="select" />
            )}
          </Step>
          <Step n={3} title="Delivery slot">
            {quote.pincode?.serviceable ? <SlotPicker slots={quote.slots} value={slot} onChange={(s) => update({ slot: s })} sameDayCutoffPassed={quote.pincode.sameDayCutoffPassed} disabled={quoting} /> : <p className="text-sm text-text-secondary">Choose a serviceable address to see delivery options.</p>}
          </Step>
          <Step n={4} title="Offers & rewards">
            <div className="flex flex-col gap-3">
              <CouponBox cart={quote.cart} onCart={() => void requote({ addressId, slot, method })} pincode={pincode} paymentMethod={method} />
              <PointsToggle cart={quote.cart} isLoggedIn={!isGuest} onCart={() => void requote({ addressId, slot, method })} next="/checkout" />
            </div>
          </Step>
          <Step n={5} title="Payment">
            <PaymentMethods value={method} onChange={(m) => update({ method: m })} total={quote.pricing.total} issues={issues} disabled={placing} />
          </Step>
        </div>
        <aside className="mt-6 lg:sticky lg:top-24 lg:mt-0">
          <OrderSummary quote={quote} isLoggedIn={!isGuest} quoting={quoting} onRemoveCoupon={() => void fetch("/api/cart/coupon", { method: "DELETE" }).then(() => requote({ addressId, slot, method }))}>
            <div className="hidden lg:block">
              <PlaceOrderBar inline total={quote.pricing.total} disabled={!canPlace} loading={placing} issue={blocker} onPlace={() => void place()} label={method === "cod" ? "Place order" : "Pay & place order"} />
              <p className="mt-2 text-center text-xs text-text-tertiary">By placing this order you agree to GLAM&apos;s terms and return policy.</p>
            </div>
          </OrderSummary>
        </aside>
      </div>
      <PlaceOrderBar total={quote.pricing.total} disabled={!canPlace} loading={placing} issue={blocker} onPlace={() => void place()} label={method === "cod" ? "Place order" : "Pay & place order"} />
    </div>
  );
}

function Step({ n, title, id, children }: { n: number; title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`step-${n}`} className="scroll-mt-24 rounded-card border border-border bg-background p-4">
      <h2 id={`step-${n}`} className="mb-3 flex items-center gap-2 font-display text-base font-bold text-text">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white" aria-hidden>
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}
