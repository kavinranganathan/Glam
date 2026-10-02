import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActiveFilterChips } from "@/components/plp/active-filter-chips";
import { Breadcrumb } from "@/components/plp/breadcrumb";
import { filtersKey, toURLSearchParams, type SearchParamsRecord } from "@/components/plp/params";
import { ProductList } from "@/components/plp/product-list";
import { ResultsHeader } from "@/components/plp/results-header";
import { SortFilterBar } from "@/components/plp/sort-filter-bar";
import { getCategoryBySlug, listProducts } from "@/lib/catalogue/queries";
import { parseListFilters } from "@/lib/catalogue/search";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParamsRecord> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getCategoryBySlug(slug).catch(() => null);
  if (!cat) return { title: "Category not found" };
  const parent = cat.path.length > 1 ? cat.path[cat.path.length - 2] : null;
  return {
    title: parent ? `${cat.node.name} — ${parent.name}` : cat.node.name,
    description: `Shop ${cat.node.name.toLowerCase()} from verified brands on GLAM. Filter by brand, price, skin type and more.`,
  };
}

/** Category landing / PLP (PRD §8.4): breadcrumb, H1 with count, subcategory chips, sticky sort/filter, infinite list. */
export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const cat = await getCategoryBySlug(slug);
  if (!cat) notFound();

  const filters = { ...parseListFilters(toURLSearchParams(sp)), category: slug };
  const result = await listProducts(filters);
  const crumbs = cat.path.map((c) => ({ name: c.name, href: `/c/${c.slug}` }));

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      <Breadcrumb items={crumbs} className="pt-3" />
      <ResultsHeader total={result.total} title={cat.node.name} />

      {cat.node.children.length > 0 && (
        <nav aria-label={`${cat.node.name} subcategories`} className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-none">
          {cat.node.children.map((child) => (
            <Link
              key={child.id}
              href={`/c/${child.slug}`}
              className="btn inline-flex h-10 shrink-0 items-center rounded-pill border border-border bg-background px-4 text-sm font-medium text-text-secondary hover:border-primary hover:text-primary"
            >
              {child.name}
            </Link>
          ))}
        </nav>
      )}

      <SortFilterBar filters={filters} facets={result.facets} total={result.total} />
      <ActiveFilterChips filters={filters} facets={result.facets} />
      <div className="pt-3">
        <ProductList key={filtersKey(filters)} initial={result} filters={filters} shelfKey={`category_${slug}`} />
      </div>
    </div>
  );
}
