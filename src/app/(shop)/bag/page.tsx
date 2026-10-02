import type { Metadata } from "next";
import { CartPage } from "@/components/cart/cart-page";
import { getCartView } from "@/lib/cart/service";
import { listProducts } from "@/lib/catalogue/queries";
import type { ProductCard } from "@/lib/catalogue/types";
import { checkoutIdentity } from "@/lib/orders/checkout-identity";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/pricing/delivery";

export const metadata: Metadata = { title: "Your Bag" };
export const dynamic = "force-dynamic";

export default async function BagPage() {
  const identity = await checkoutIdentity();
  const [cart, bestSellers, nudgeItems] = await Promise.all([
    getCartView(identity),
    listProducts({ sort: "popularity", pageSize: 10, inStock: true })
      .then((r) => r.items)
      .catch((): ProductCard[] => []),
    listProducts({ sort: "popularity", pageSize: 12, inStock: true, priceMax: FREE_DELIVERY_THRESHOLD })
      .then((r) => r.items)
      .catch((): ProductCard[] => []),
  ]);
  return <CartPage initialCart={cart} isLoggedIn={Boolean(identity.user)} bestSellers={bestSellers} nudgeItems={nudgeItems} />;
}
