import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { RatingSummary } from "@/components/ui/rating-stars";
import { cn } from "@/lib/utils/cn";
import type { ProductCard as ProductCardData } from "@/lib/catalogue/types";
import { WishlistButton } from "./wishlist-button";
import { QuickAdd } from "./quick-add";
import { NotifyMeButton } from "./notify-me";

/** Product card per PRD §8.4.2. Server component; interactive bits are client islands. */
export function ProductCard({
  product,
  layout = "grid",
  priority,
  className,
  shelf,
  position,
}: {
  product: ProductCardData;
  layout?: "grid" | "list";
  priority?: boolean;
  className?: string;
  shelf?: string;
  position?: number;
}) {
  const sponsored = product.badges.includes("sponsored");
  const href = `/p/${product.slug}${shelf ? `?src=${encodeURIComponent(shelf)}` : ""}`;
  const isList = layout === "list";
  return (
    <article
      className={cn(
        "group relative flex rounded-card border border-border bg-background shadow-card transition hover:shadow-md",
        isList ? "flex-row gap-3 p-2" : "flex-col",
        className,
      )}
      data-sku={product.defaultVariantId}
      data-position={position}
    >
      <Link href={href} className={cn("relative block overflow-hidden bg-surface", isList ? "h-32 w-32 shrink-0 rounded-card" : "aspect-square rounded-t-card")}>
        <Image
          src={product.image}
          alt={`${product.brand.name} ${product.name}`}
          fill
          sizes={isList ? "128px" : "(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"}
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          priority={priority}
        />
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {sponsored && <Badge tone="neutral" className="bg-white/90">Ad</Badge>}
          {product.badges.includes("best_seller") && <Badge tone="warning" className="bg-orange-500 text-white">Best Seller</Badge>}
          {product.badges.includes("new") && <Badge tone="info">New Launch</Badge>}
          {product.badges.includes("limited") && <Badge tone="error">Limited Time</Badge>}
        </div>
        {!product.inStock && (
          <div className="absolute inset-0 flex items-end justify-center bg-white/60 p-2">
            <span className="rounded-pill bg-text px-3 py-1 text-xs font-semibold text-white">Out of Stock</span>
          </div>
        )}
      </Link>
      <div className="absolute right-2 top-2 flex flex-col gap-2">
        <WishlistButton productId={product.id} size="sm" />
      </div>
      <div className={cn("flex flex-1 flex-col gap-1", isList ? "py-1 pr-2" : "p-3")}>
        <p className="truncate text-xs font-medium text-text-tertiary">{product.brand.name}</p>
        <Link href={href} className="line-clamp-2 text-sm font-semibold text-text leading-snug">
          {product.name}
        </Link>
        <RatingSummary avg={product.ratingAvg} count={product.ratingCount >= 10 ? product.ratingCount : 0} />
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div className="min-w-0">
            <Price price={product.flashPrice ?? product.price} mrp={product.mrp} size="sm" />
            {product.offerLabel && <p className="mt-0.5 text-xs font-semibold text-secondary">{product.offerLabel}</p>}
            {product.lowStock && product.inStock && <p className="mt-0.5 text-xs font-semibold text-warning">Only a few left!</p>}
          </div>
          {product.inStock ? (
            <QuickAdd product={product} />
          ) : (
            <NotifyMeButton variantId={product.defaultVariantId} compact />
          )}
        </div>
      </div>
    </article>
  );
}
