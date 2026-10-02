import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WishlistPage } from "@/components/wishlist/wishlist-page";
import { getUser } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { getWishlist } from "@/lib/wishlist/service";

export const metadata: Metadata = { title: "Wishlist" };
export const dynamic = "force-dynamic";

export default async function WishlistRoute() {
  const user = await getUser();
  if (!user) redirect("/login?next=/wishlist");
  const data = await getWishlist(user.id);
  return <WishlistPage initial={data} siteUrl={env.siteUrl} />;
}
