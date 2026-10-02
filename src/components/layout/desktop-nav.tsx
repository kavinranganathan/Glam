import Link from "next/link";
import { Sparkles, Zap } from "lucide-react";

export interface NavCategory {
  slug: string;
  name: string;
  children: Array<{ slug: string; name: string }>;
}

/** Desktop category navigation with hover mega-menus. Hidden on mobile. */
export function DesktopNav({ categories, flashSaleActive }: { categories: NavCategory[]; flashSaleActive: boolean }) {
  return (
    <div className="hidden md:block border-b border-border bg-background no-print">
      <nav className="mx-auto flex max-w-7xl items-center gap-1 px-4 h-11 text-sm font-medium" aria-label="Categories">
        {categories.map((c) => (
          <div key={c.slug} className="group relative">
            <Link href={`/c/${c.slug}`} className="inline-flex h-11 items-center px-3 text-text-secondary hover:text-primary">
              {c.name}
            </Link>
            {c.children.length > 0 && (
              <div className="invisible absolute left-0 top-full z-30 min-w-[14rem] rounded-b-card border border-border bg-background p-3 shadow-lg opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <ul className="flex flex-col">
                  {c.children.map((s) => (
                    <li key={s.slug}>
                      <Link href={`/c/${s.slug}`} className="block rounded px-2 py-1.5 text-text-secondary hover:bg-surface hover:text-primary">
                        {s.name}
                      </Link>
                    </li>
                  ))}
                  <li className="mt-1 border-t border-border pt-1">
                    <Link href={`/c/${c.slug}`} className="block rounded px-2 py-1.5 font-semibold text-primary">
                      View all {c.name}
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </div>
        ))}
        <span className="flex-1" />
        {flashSaleActive && (
          <Link href="/flash-sale" className="inline-flex h-11 items-center gap-1 px-3 font-semibold text-error">
            <Zap className="h-4 w-4" aria-hidden /> Flash Sale
          </Link>
        )}
        <Link href="/offers" className="inline-flex h-11 items-center px-3 text-text-secondary hover:text-primary">
          Offers
        </Link>
        <Link href="/pro" className="inline-flex h-11 items-center gap-1 px-3 font-semibold text-secondary">
          <Sparkles className="h-4 w-4" aria-hidden /> GLAM Pro
        </Link>
      </nav>
    </div>
  );
}
