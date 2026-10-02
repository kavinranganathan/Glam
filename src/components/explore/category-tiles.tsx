"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface CategoryTile {
  slug: string;
  name: string;
  imageUrl: string | null;
  children: Array<{ slug: string; name: string }>;
}

/** Root categories as image tiles; a tile with children expands into a subcategory chip row. */
export function CategoryTiles({ tiles }: { tiles: CategoryTile[] }) {
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const open = tiles.find((t) => t.slug === expanded) ?? null;
  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => {
          const isOpen = expanded === t.slug;
          return (
            <li key={t.slug} className={cn("overflow-hidden rounded-card border bg-background shadow-card", isOpen ? "border-primary" : "border-border")}>
              <Link href={`/c/${t.slug}`} className="relative block aspect-[4/3] bg-surface">
                {t.imageUrl ? (
                  <Image src={t.imageUrl} alt={t.name} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center font-display text-3xl font-bold text-primary">{t.name.charAt(0)}</span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-sm font-bold text-white">{t.name}</span>
              </Link>
              {t.children.length > 0 ? (
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`subcats-${t.slug}`}
                  onClick={() => setExpanded(isOpen ? null : t.slug)}
                  className="flex h-11 w-full items-center justify-between px-3 text-xs font-medium text-text-secondary hover:bg-surface"
                >
                  {t.children.length} subcategories
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} aria-hidden />
                </button>
              ) : (
                <span className="flex h-11 items-center px-3 text-xs text-text-tertiary">Shop all</span>
              )}
            </li>
          );
        })}
      </ul>
      {open && (
        <div id={`subcats-${open.slug}`} className="rounded-card border border-border bg-surface p-3 animate-fade-up">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">{open.name}</h3>
            <Link href={`/c/${open.slug}`} className="text-xs font-semibold text-primary">
              View all {open.name}
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {open.children.map((c) => (
              <Link key={c.slug} href={`/c/${c.slug}`} className="inline-flex h-10 items-center rounded-pill border border-border bg-background px-4 text-sm font-medium text-text-secondary hover:border-primary hover:text-primary">
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
