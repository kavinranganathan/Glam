import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface Crumb {
  name: string;
  href: string;
}

/** Breadcrumb trail with schema.org BreadcrumbList JSON-LD. `items` excludes Home. */
export function Breadcrumb({ items, className }: { items: Crumb[]; className?: string }) {
  const all: Crumb[] = [{ name: "Home", href: "/" }, ...items];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.href,
    })),
  };
  return (
    <nav aria-label="Breadcrumb" className={cn("text-xs text-text-tertiary", className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {all.map((c, i) => {
          const last = i === all.length - 1;
          return (
            <li key={c.href} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" aria-hidden />}
              {last ? (
                <span aria-current="page" className="font-medium text-text-secondary">
                  {c.name}
                </span>
              ) : (
                <Link href={c.href} className="hover:text-text">
                  {c.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </nav>
  );
}
