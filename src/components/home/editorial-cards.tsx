import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { EditorialView } from "@/lib/catalogue/types";

/** "The Beauty Edit" editorial cards, 3 visible (PRD §8.2.2 #7). */
export function EditorialCards({ cards }: { cards: EditorialView[] }) {
  const shown = cards.slice(0, 3);
  if (!shown.length) return null;
  return (
    <section aria-labelledby="beauty-edit-title" className="py-4">
      <div className="mb-3 flex items-end justify-between px-4">
        <div>
          <h2 id="beauty-edit-title" className="font-display text-lg font-bold text-text md:text-xl">
            The Beauty Edit
          </h2>
          <p className="text-sm text-text-tertiary">Guides, routines and trends from our editors</p>
        </div>
      </div>
      <div className="flex snap-x gap-3 overflow-x-auto px-4 pb-2 scrollbar-none md:grid md:grid-cols-3 md:overflow-visible">
        {shown.map((c) => (
          <Link
            key={c.id}
            href={c.href}
            className="group relative aspect-[4/3] w-[78vw] shrink-0 snap-start overflow-hidden rounded-card bg-surface shadow-card sm:w-80 md:w-auto"
          >
            <Image src={c.imageUrl} alt={c.title} fill sizes="(max-width: 768px) 78vw, 33vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" aria-hidden />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
              <h3 className="font-display text-base font-bold leading-snug md:text-lg">{c.title}</h3>
              {c.excerpt && <p className="mt-1 line-clamp-2 text-xs text-white/85 md:text-sm">{c.excerpt}</p>}
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide">
                Read more <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
