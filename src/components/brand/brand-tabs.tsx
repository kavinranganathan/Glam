"use client";

import * as React from "react";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { ProductList } from "@/components/plp/product-list";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";
import type { ListFilters, ListResult } from "@/lib/catalogue/types";

type Tab = "new" | "best" | "all" | "about";

export interface BrandTabsBrand {
  slug: string;
  name: string;
  about: string | null;
  certifications: string[];
  socials: Record<string, string>;
}

const SOCIAL_LABEL: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  facebook: "Facebook",
  x: "X",
  twitter: "X (Twitter)",
  website: "Website",
  pinterest: "Pinterest",
};

/** Brand storefront tabs (PRD §8.14). Product tabs stream from /api/products with infinite scroll. */
export function BrandTabs({ brand, initial }: { brand: BrandTabsBrand; initial: ListResult }) {
  const [tab, setTab] = React.useState<Tab>("new");
  const filters: Record<Exclude<Tab, "about">, ListFilters> = {
    new: { brands: [brand.slug], sort: "newest" },
    best: { brands: [brand.slug], sort: "popularity" },
    all: { brands: [brand.slug], sort: "relevance" },
  };
  return (
    <div>
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "new", label: "New Arrivals" },
          { value: "best", label: "Best Sellers" },
          { value: "all", label: "All Products", count: initial.total },
          { value: "about", label: "About" },
        ]}
        className="sticky top-14 z-30 bg-background md:top-16"
      />
      <div role="tabpanel" className="pt-4">
        {tab === "about" ? (
          <About brand={brand} />
        ) : (
          <ProductList
            key={tab}
            filters={filters[tab]}
            initial={tab === "new" ? initial : undefined}
            shelfKey={`brand_${tab}`}
            emptyState={<EmptyState title={`${brand.name} has no products here yet`} description="Check back soon or explore similar brands." action={{ label: "Explore brands", href: "/explore" }} />}
          />
        )}
      </div>
    </div>
  );
}

function About({ brand }: { brand: BrandTabsBrand }) {
  const paragraphs = (brand.about ?? "").split(/\n+/).filter(Boolean);
  const socials = Object.entries(brand.socials);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 animate-fade-up">
      <section aria-labelledby="brand-about-title">
        <h2 id="brand-about-title" className="font-display text-lg font-bold text-text">
          About {brand.name}
        </h2>
        {paragraphs.length ? (
          paragraphs.map((p, i) => (
            <p key={i} className="mt-2 text-sm leading-relaxed text-text-secondary">
              {p}
            </p>
          ))
        ) : (
          <p className="mt-2 text-sm text-text-tertiary">This brand hasn’t added a story yet.</p>
        )}
      </section>
      {brand.certifications.length > 0 && (
        <section aria-labelledby="brand-certs-title">
          <h2 id="brand-certs-title" className="font-display text-base font-bold text-text">
            Certifications
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {brand.certifications.map((c) => (
              <Badge key={c} tone="success" className="px-3 py-1">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> {c}
              </Badge>
            ))}
          </div>
        </section>
      )}
      {socials.length > 0 && (
        <section aria-labelledby="brand-social-title">
          <h2 id="brand-social-title" className="font-display text-base font-bold text-text">
            Follow {brand.name} elsewhere
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {socials.map(([key, url]) => (
              <li key={key}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn inline-flex h-10 items-center gap-1.5 rounded-pill border border-border px-4 text-sm font-medium text-text-secondary hover:border-primary hover:text-primary"
                >
                  {SOCIAL_LABEL[key.toLowerCase()] ?? key}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
