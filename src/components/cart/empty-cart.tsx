import { ShoppingBag } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Shelf } from "@/components/product/shelf";
import type { ProductCard } from "@/lib/catalogue/types";

export function EmptyCart({ bestSellers, isLoggedIn }: { bestSellers: ProductCard[]; isLoggedIn: boolean }) {
  return (
    <div>
      <EmptyState
        icon={<ShoppingBag className="h-8 w-8" aria-hidden />}
        title="Your bag is empty"
        description="Looks like you haven't added anything yet. Explore our best sellers or pick up where you left off."
        action={{ label: "Start Shopping", href: "/" }}
        secondary={isLoggedIn ? { label: "View wishlist", href: "/wishlist" } : { label: "Sign in", href: "/login?next=/bag" }}
      />
      <Shelf title="Best Sellers" subtitle="Loved by thousands of GLAM shoppers" href="/search?sort=popularity" items={bestSellers} shelfKey="bag_best_sellers" className="-mx-4" />
    </div>
  );
}
