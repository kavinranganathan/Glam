"use client";

import Image from "next/image";
import Link from "next/link";
import { Award, BookOpen, FlaskConical, Info, Leaf, Sparkles, Store, TriangleAlert } from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { Badge, VerifiedBadge } from "@/components/ui/badge";
import type { ProductDetail } from "@/lib/catalogue/types";

const FLAG_REASON =
  "Flagged ingredients are ones that some skin types react to (common irritants, fragrances or comedogenic oils). They are safe for most people — patch test if you have sensitive skin.";

const BENEFIT_ICONS = [Sparkles, Leaf, Award, FlaskConical];

/** Details accordion (PRD §8.5.7). Text is rendered as plain text, never as HTML. */
export function DetailsAccordion({ product }: { product: ProductDetail }) {
  const flagged = new Set(product.flaggedIngredients.map((f) => f.toLowerCase()));
  const items = [
    {
      id: "description",
      title: "Description",
      icon: <BookOpen className="h-4 w-4 text-text-tertiary" aria-hidden />,
      content: (
        <div className="space-y-3">
          {product.description
            .split(/\n{2,}|\r?\n/)
            .filter(Boolean)
            .map((para, i) => (
              <p key={i} className="leading-relaxed whitespace-pre-line">
                {para}
              </p>
            ))}
          {(product.skinTypes.length > 0 || product.finish) && (
            <p className="text-xs text-text-tertiary">
              {product.skinTypes.length > 0 && <>Suited for {product.skinTypes.join(", ")} skin. </>}
              {product.finish && <>Finish: {product.finish}.</>}
            </p>
          )}
        </div>
      ),
    },
    product.benefits.length > 0 && {
      id: "benefits",
      title: "Key Benefits",
      icon: <Sparkles className="h-4 w-4 text-text-tertiary" aria-hidden />,
      content: (
        <ul className="grid gap-2 sm:grid-cols-2">
          {product.benefits.map((b, i) => {
            const Icon = BENEFIT_ICONS[i % BENEFIT_ICONS.length];
            return (
              <li key={b} className="flex items-start gap-2 rounded-card bg-surface p-3 text-text">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>{b}</span>
              </li>
            );
          })}
        </ul>
      ),
    },
    product.ingredients.length > 0 && {
      id: "ingredients",
      title: "Ingredients",
      icon: <FlaskConical className="h-4 w-4 text-text-tertiary" aria-hidden />,
      content: (
        <div className="space-y-3">
          <ul className="flex flex-wrap gap-1.5" aria-label="Ingredients">
            {product.ingredients.map((ing) => {
              const isFlagged = flagged.has(ing.toLowerCase());
              return (
                <li key={ing}>
                  {isFlagged ? (
                    <Badge tone="warning" title={FLAG_REASON}>
                      <TriangleAlert className="h-3 w-3" aria-hidden /> {ing}
                    </Badge>
                  ) : (
                    <Badge tone="neutral">{ing}</Badge>
                  )}
                </li>
              );
            })}
          </ul>
          {product.flaggedIngredients.length > 0 && (
            <details className="rounded-card bg-warning-soft p-3 text-warning">
              <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold">
                <Info className="h-4 w-4" aria-hidden /> Why flagged?
              </summary>
              <p className="mt-2 text-sm">{FLAG_REASON}</p>
            </details>
          )}
          {product.freeFrom.length > 0 && <p className="text-xs text-text-tertiary">Free from: {product.freeFrom.join(", ")}</p>}
        </div>
      ),
    },
    product.howToUse.length > 0 && {
      id: "how-to-use",
      title: "How to Use",
      icon: <Info className="h-4 w-4 text-text-tertiary" aria-hidden />,
      content: (
        <ol className="space-y-2">
          {product.howToUse.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary" aria-hidden>
                {i + 1}
              </span>
              <span className="pt-0.5 text-text">{step}</span>
            </li>
          ))}
        </ol>
      ),
    },
    {
      id: "brand",
      title: "About the Brand",
      icon: <Store className="h-4 w-4 text-text-tertiary" aria-hidden />,
      content: (
        <div className="flex gap-3">
          {product.brandLogo && (
            <Image src={product.brandLogo} alt={`${product.brand.name} logo`} width={56} height={56} className="h-14 w-14 shrink-0 rounded-card object-cover bg-surface" />
          )}
          <div className="min-w-0 space-y-1.5">
            <p className="flex items-center gap-2 font-semibold text-text">
              {product.brand.name}
              {product.brandVerified && <VerifiedBadge />}
            </p>
            {product.brandAbout && <p className="leading-relaxed">{product.brandAbout}</p>}
            <Link href={`/b/${product.brand.slug}`} className="inline-block text-sm font-semibold text-primary">
              Visit the {product.brand.name} store →
            </Link>
          </div>
        </div>
      ),
    },
    product.certifications.length > 0 && {
      id: "certifications",
      title: "Certifications",
      icon: <Award className="h-4 w-4 text-text-tertiary" aria-hidden />,
      content: (
        <ul className="flex flex-wrap gap-2">
          {product.certifications.map((c) => (
            <li key={c}>
              <Badge tone="success">
                <Award className="h-3 w-3" aria-hidden /> {c}
              </Badge>
            </li>
          ))}
        </ul>
      ),
    },
  ].filter((x): x is Exclude<typeof x, false> => Boolean(x));

  return <Accordion items={items} defaultOpen={["description"]} />;
}
