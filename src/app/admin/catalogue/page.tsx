import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/data-table";
import { StockEditor } from "@/components/admin/stock-editor";
import { requireAdminPage } from "@/lib/admin/guard";
import { LOW_STOCK_THRESHOLD } from "@/lib/admin/rules";
import { listLowStock, searchAdminProducts } from "@/lib/admin/service";

export const dynamic = "force-dynamic";

export default async function AdminCataloguePage({ searchParams }: { searchParams: Promise<{ q?: string; low?: string }> }) {
  await requireAdminPage("/admin/catalogue");
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const [products, low] = await Promise.all([searchAdminProducts(q), sp.low ? listLowStock(LOW_STOCK_THRESHOLD, 50) : Promise.resolve([])]);
  return (
    <>
      <PageHeader title="Catalogue" description="Quick stock and pricing edits. Restocking from 0 sends back-in-stock alerts; lowering a price sends price-drop alerts to wishlists." />
      <form method="get" role="search" aria-label="Search products" className="mb-4 flex flex-wrap items-end gap-2">
        <label className="flex min-w-64 flex-1 flex-col gap-1 text-xs font-medium text-text-secondary">
          Search
          <input name="q" defaultValue={q} placeholder="Product name, slug or SKU" className="h-11 rounded-input border border-border bg-background px-3 text-sm" />
        </label>
        <Button type="submit">Search</Button>
        <Button href="/admin/catalogue?low=1" variant="outline">
          Low stock
        </Button>
        {(q || sp.low) && (
          <Button href="/admin/catalogue" variant="ghost">
            Clear
          </Button>
        )}
      </form>
      {sp.low ? (
        <section className="mb-6 rounded-card border border-border bg-background">
          <h2 className="border-b border-border px-4 py-2 font-display text-base font-semibold">Low stock (≤ {LOW_STOCK_THRESHOLD})</h2>
          <ul className="divide-y divide-border text-sm">
            {low.length === 0 && <li className="px-4 py-6 text-center text-text-tertiary">No low-stock variants.</li>}
            {low.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <span>
                  <a href={`/admin/catalogue?q=${encodeURIComponent(v.sku)}`} className="font-medium text-primary hover:underline">
                    {v.productName}
                  </a>{" "}
                  <span className="text-text-tertiary">· {v.name}</span>
                  <span className="block font-mono text-[11px] text-text-tertiary">{v.sku}</span>
                </span>
                <span className="tabular-nums font-semibold">{v.stock}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          <p className="mb-2 text-xs text-text-tertiary">{q ? `Results for “${q}”` : "Recently updated products"}</p>
          <StockEditor products={products} />
        </>
      )}
    </>
  );
}
