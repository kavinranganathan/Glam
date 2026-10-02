import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { CheckoutPage } from "@/components/checkout/checkout-page";
import { EmptyState } from "@/components/ui/empty-state";
import { getUser } from "@/lib/auth/session";
import { getGuestSessionId } from "@/lib/auth/guest";
import { listAddresses } from "@/lib/orders/addresses";
import { quoteCheckout } from "@/lib/orders/service";
import { ApiError } from "@/lib/api/respond";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CheckoutRoute({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getUser();
  const sp = await searchParams;
  const buyNow = typeof sp.buyNow === "string" && UUID.test(sp.buyNow) ? [sp.buyNow] : null;

  // Guest checkout (PRD §8.1.3): no sign-in required; the guest enters an email and an inline address.
  const [sessionId, addresses] = await Promise.all([getGuestSessionId(), user ? listAddresses(user.id) : Promise.resolve([])]);
  const identity = { user: user ? { id: user.id } : null, sessionId, email: user ? (user.email ?? user.authEmail ?? null) : null };
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;

  let quote;
  try {
    quote = await quoteCheckout(identity, { addressId: defaultAddress?.id ?? null, slot: "standard", paymentMethod: "upi", onlyItemIds: buyNow });
  } catch (e) {
    if (e instanceof ApiError && e.code === "ITEM_NOT_FOUND") redirect("/bag");
    throw e;
  }

  if (quote.cart.items.length === 0) {
    return <EmptyState icon={<ShoppingBag className="h-8 w-8" aria-hidden />} title="Your bag is empty" description="Add something you love before checking out." action={{ label: "Start Shopping", href: "/" }} secondary={{ label: "View wishlist", href: "/wishlist" }} />;
  }
  return <CheckoutPage initialQuote={quote} initialAddresses={addresses} buyNowItemIds={buyNow} isGuest={!user} />;
}
