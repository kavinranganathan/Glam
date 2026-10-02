import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { CategoryTiles, type CategoryTile } from "@/components/explore/category-tiles";
import { ExploreSearchButton } from "@/components/explore/search-button";
import { VerifiedBadge } from "@/components/ui/badge";
import { FALLBACK_TRENDING, getCategoryTree, getTrendingSearches, listBrands } from "@/lib/catalogue/queries";

export const metadata: Metadata = {
  title: "Explore",
  description: "Browse every category, trending searches and top brands on GLAM.",
};

const TOP_BRANDS = 12;

export default async function ExplorePage() {
  const [tree, trending, brands] = await Promise.all([
    getCategoryTree().catch(() => []),
    getTrendingSearches(10).catch(() => FALLBACK_TRENDING),
    listBrands().catch(() => []),
  ]);
  const tiles: CategoryTile[] = tree.slice(0, 8).map((c) => ({
    slug: c.slug,
    name: c.name,
    imageUrl: c.imageUrl,
    children: c.children.map((s) => ({ slug: s.slug, name: s.name })),
  }));
  const topBrands = [...brands].sort((a, b) => a.tier - b.tier || b.followerCount - a.followerCount || a.name.localeCompare(b.name)).slice(0, TOP_BRANDS);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-4">
      <h1 className="sr-only">Explore</h1>
      <ExploreSearchButton />

      <section aria-labelledby="explore-categories">
        <h2 id="explore-categories" className="mb-3 font-display text-lg font-bold text-text md:text-xl">
          Shop by category
        </h2>
        <CategoryTiles tiles={tiles} />
      </section>

      {trending.length > 0 && (
        <section aria-labelledby="explore-trending">
          <h2 id="explore-trending" className="mb-3 font-display text-lg font-bold text-text md:text-xl">
            Trending searches
          </h2>
          <ul className="flex flex-wrap gap-2">
            {trending.map((t) => (
              <li key={t}>
                <Link
                  href={`/search?q=${encodeURIComponent(t)}`}
                  className="btn inline-flex h-10 items-center gap-1.5 rounded-pill bg-surface px-4 text-sm font-medium text-text-secondary hover:bg-primary-soft hover:text-primary"
                >
                  <TrendingUp className="h-3.5 w-3.5 text-primary" aria-hidden />
                  {t}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {topBrands.length > 0 && (
        <section aria-labelledby="explore-brands">
          <h2 id="explore-brands" className="mb-3 font-display text-lg font-bold text-text md:text-xl">
            Top brands
          </h2>
          <ul className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-none">
            {topBrands.map((b) => (
              <li key={b.id} className="shrink-0">
                <Link href={`/b/${b.slug}`} className="flex w-24 flex-col items-center gap-2 text-center">
                  <span className="relative block h-20 w-20 overflow-hidden rounded-full border border-border bg-surface shadow-card">
                    {b.logoUrl ? (
                      <Image src={b.logoUrl} alt={`${b.name} logo`} fill sizes="80px" className="object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center font-display text-2xl font-bold text-primary" aria-hidden>
                        {b.name.charAt(0)}
                      </span>
                    )}
                  </span>
                  <span className="line-clamp-2 text-xs font-medium leading-tight text-text-secondary">{b.name}</span>
                  {b.verified && <VerifiedBadge className="px-1.5 text-[10px]" />}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
