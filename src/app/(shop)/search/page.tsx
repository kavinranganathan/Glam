import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { SearchX } from "lucide-react";
import { ActiveFilterChips } from "@/components/plp/active-filter-chips";
import { filtersKey, toURLSearchParams, type SearchParamsRecord } from "@/components/plp/params";
import { ProductList } from "@/components/plp/product-list";
import { ResultsHeader } from "@/components/plp/results-header";
import { SortFilterBar } from "@/components/plp/sort-filter-bar";
import { Shelf } from "@/components/product/shelf";
import { EmptyState } from "@/components/ui/empty-state";
import { getGuestSessionId } from "@/lib/auth/guest";
import { getUser } from "@/lib/auth/session";
import { listBrands, listProducts, suggest } from "@/lib/catalogue/queries";
import { recordSearch } from "@/lib/catalogue/recently-viewed";
import { parseListFilters } from "@/lib/catalogue/search";
import type { BrandView, ListResult, ProductCard } from "@/lib/catalogue/types";

type Props = { searchParams: Promise<SearchParamsRecord> };

const SPONSORED_SLOTS = 2;

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = parseListFilters(toURLSearchParams(await searchParams)).q;
  return { title: q ? `‘${q}’ — Search` : "Search" };
}

/** Up to two tier-1 brand items on page 1 carry the `sponsored` badge; positions are unchanged. */
function markSponsored(items: ProductCard[], brands: BrandView[]): ProductCard[] {
  const tier1 = new Set(brands.filter((b) => b.tier === 1).map((b) => b.id));
  let left = SPONSORED_SLOTS - items.filter((p) => p.badges.includes("sponsored")).length;
  return items.map((p) => {
    if (left > 0 && tier1.has(p.brand.id) && !p.badges.includes("sponsored")) {
      left -= 1;
      return { ...p, badges: [...p.badges, "sponsored"] };
    }
    return p;
  });
}

export default async function SearchPage({ searchParams }: Props) {
  const filters = parseListFilters(toURLSearchParams(await searchParams));
  const q = filters.q;

  const [result, brands, user, sessionId] = await Promise.all([
    listProducts(filters),
    q && filters.page === 1 ? listBrands().catch(() => [] as BrandView[]) : Promise.resolve([] as BrandView[]),
    getUser().catch(() => null),
    getGuestSessionId(),
  ]);
  if (q) {
    const viewer = user ? { id: user.id } : null;
    after(() => recordSearch(q, viewer, sessionId).catch((e: unknown) => console.error("[search] recordSearch failed", e)));
  }

  const initial: ListResult = q && result.page === 1 ? { ...result, items: markSponsored(result.items, brands) } : result;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      <ResultsHeader total={result.total} query={q} />
      {result.total === 0 ? (
        <NoResults query={q} />
      ) : (
        <>
          <SortFilterBar filters={filters} facets={result.facets} total={result.total} />
          <ActiveFilterChips filters={filters} facets={result.facets} />
          <div className="pt-3">
            <ProductList key={filtersKey(filters)} initial={initial} filters={filters} shelfKey="search" />
          </div>
        </>
      )}
    </div>
  );
}

async function NoResults({ query }: { query?: string }) {
  const [hints, trending] = await Promise.all([
    query ? suggest(query).catch(() => null) : Promise.resolve(null),
    listProducts({ sort: "popularity", pageSize: 10 }).catch(() => null),
  ]);
  const suggestions = hints
    ? [
        ...hints.categories.map((c) => ({ label: c.name, href: `/c/${c.slug}` })),
        ...hints.brands.map((b) => ({ label: b.name, href: `/b/${b.slug}` })),
        ...hints.products.slice(0, 3).map((p) => ({ label: p.name, href: `/p/${p.slug}` })),
      ]
    : [];
  return (
    <div className="flex flex-col gap-4">
      <EmptyState
        icon={<SearchX className="h-7 w-7" aria-hidden />}
        title={query ? `No results for ‘${query}’` : "Start with a search"}
        description={query ? "Check the spelling, try fewer words, or browse the suggestions below." : "Search by product, brand or concern to find your next favourite."}
        action={{ label: "Explore categories", href: "/explore" }}
        secondary={query ? { label: "Clear search", href: "/search" } : undefined}
        className="py-10"
      />
      {suggestions.length > 0 && (
        <section aria-labelledby="did-you-mean" className="text-center">
          <h2 id="did-you-mean" className="mb-2 text-sm font-semibold text-text-secondary">
            Did you mean
          </h2>
          <ul className="flex flex-wrap justify-center gap-2">
            {suggestions.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="btn inline-flex h-10 items-center rounded-pill border border-border px-4 text-sm font-medium text-text hover:border-primary hover:text-primary">
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {trending && trending.items.length > 0 && (
        <Shelf title="Trending now" subtitle="What everyone is buying this week" href="/search?sort=popularity" items={trending.items} shelfKey="search_trending" className="-mx-4" />
      )}
    </div>
  );
}
