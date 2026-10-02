import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductGrid } from "@/components/product/shelf";
import { getProductsByIds } from "@/lib/catalogue/queries";
import { getSharedCollection } from "@/lib/wishlist/service";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const shared = await getSharedCollection(token);
  return { title: shared ? `${shared.ownerName}'s ${shared.collection.name}` : "Wishlist", robots: { index: false } };
}

/** Public read-only view of a shared wishlist collection. */
export default async function SharedWishlistPage({ params }: Props) {
  const { token } = await params;
  const shared = await getSharedCollection(token);
  if (!shared) notFound();
  const products = await getProductsByIds(shared.items.map((i) => i.productId));
  return (
    <div className="mx-auto max-w-6xl px-4 py-4 md:py-8">
      <p className="text-sm text-text-tertiary">Shared wishlist</p>
      <h1 className="font-display text-2xl font-bold text-text">
        {shared.ownerName}&apos;s {shared.collection.name}
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        {shared.collection.itemCount} {shared.collection.itemCount === 1 ? "item" : "items"}
      </p>
      {products.length === 0 ? (
        <EmptyState icon={<Heart className="h-8 w-8" aria-hidden />} title="Nothing here yet" description="This collection is empty or its products are no longer available." action={{ label: "Explore GLAM", href: "/" }} />
      ) : (
        <div className="mt-4">
          <ProductGrid items={products} shelfKey="shared_wishlist" />
        </div>
      )}
      <div className="mt-8 flex justify-center">
        <Button href="/wishlist" variant="outline">
          Create your own wishlist
        </Button>
      </div>
    </div>
  );
}
