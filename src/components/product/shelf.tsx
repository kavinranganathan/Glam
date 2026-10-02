import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ProductCard as ProductCardData } from "@/lib/catalogue/types";
import { ProductCard } from "./product-card";

/** Horizontally scrolling product shelf used on home, PDP and cart upsell. */
export function Shelf({
  title,
  subtitle,
  href,
  items,
  shelfKey,
  className,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  items: ProductCardData[];
  shelfKey?: string;
  className?: string;
}) {
  if (!items.length) return null;
  return (
    <section className={cn("py-4", className)} aria-labelledby={`shelf-${shelfKey ?? title}`}>
      <div className="mb-3 flex items-end justify-between gap-3 px-4">
        <div>
          <h2 id={`shelf-${shelfKey ?? title}`} className="font-display text-lg font-bold text-text md:text-xl">
            {title}
          </h2>
          {subtitle && <p className="text-sm text-text-tertiary">{subtitle}</p>}
        </div>
        {href && (
          <Link href={href} className="inline-flex items-center gap-0.5 text-sm font-semibold text-primary">
            See all <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
      <div className="flex snap-x gap-3 overflow-x-auto px-4 pb-2 scrollbar-none">
        {items.map((p, i) => (
          <div key={p.id} className="w-[46vw] shrink-0 snap-start sm:w-56 md:w-60">
            <ProductCard product={p} shelf={shelfKey} position={i} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProductGrid({
  items,
  layout = "grid",
  shelfKey,
  className,
}: {
  items: ProductCardData[];
  layout?: "grid" | "list";
  shelfKey?: string;
  className?: string;
}) {
  return (
    <div className={cn(layout === "grid" ? "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4" : "flex flex-col gap-3", className)}>
      {items.map((p, i) => (
        <ProductCard key={p.id} product={p} layout={layout} shelf={shelfKey} position={i} priority={i < 4} />
      ))}
    </div>
  );
}
