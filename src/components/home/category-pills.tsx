import Image from "next/image";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import type { CategoryNode } from "@/lib/catalogue/types";

/** Horizontally scrollable round category pills with a trailing "See All" (PRD §8.2.2 #2). */
export function CategoryPills({ categories }: { categories: CategoryNode[] }) {
  if (!categories.length) return null;
  return (
    <nav aria-label="Shop by category" className="py-4">
      <ul className="flex gap-4 overflow-x-auto px-4 scrollbar-none">
        {categories.map((c) => (
          <li key={c.id} className="shrink-0">
            <Link href={`/c/${c.slug}`} className="flex w-[4.5rem] flex-col items-center gap-2 text-center">
              <span className="relative block h-16 w-16 overflow-hidden rounded-full border border-border bg-surface">
                {c.imageUrl ? (
                  <Image src={c.imageUrl} alt="" fill sizes="64px" className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-display text-lg font-bold text-primary" aria-hidden>
                    {c.name.charAt(0)}
                  </span>
                )}
              </span>
              <span className="line-clamp-2 text-xs font-medium leading-tight text-text-secondary">{c.name}</span>
            </Link>
          </li>
        ))}
        <li className="shrink-0">
          <Link href="/explore" className="flex w-[4.5rem] flex-col items-center gap-2 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-primary/50 bg-primary-soft text-primary">
              <LayoutGrid className="h-6 w-6" aria-hidden />
            </span>
            <span className="text-xs font-semibold text-primary">See All</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export function CategoryPillsSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden px-4 py-4" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex w-[4.5rem] shrink-0 flex-col items-center gap-2">
          <div className="skeleton h-16 w-16 rounded-full" />
          <div className="skeleton h-3 w-12 rounded" />
        </div>
      ))}
    </div>
  );
}
