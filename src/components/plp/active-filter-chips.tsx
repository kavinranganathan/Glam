"use client";

import { Chip } from "@/components/ui/chip";
import { activeFilterCount } from "@/lib/catalogue/search";
import type { Facets, ListFilters } from "@/lib/catalogue/types";
import { formatINR } from "@/lib/utils/money";
import { useFilterNav } from "./use-filter-nav";

interface ActiveChip {
  key: string;
  label: string;
  remove: (f: ListFilters) => ListFilters;
}

const DELIVERY_LABEL: Record<NonNullable<ListFilters["delivery"]>, string> = {
  same_day: "Same day delivery",
  next_day: "Next day delivery",
  standard: "Standard delivery",
};
const OFFER_LABEL: Record<NonNullable<ListFilters["offer"]>[number], string> = {
  on_sale: "On sale",
  bxgy: "Buy X Get Y",
  flash: "Flash sale",
};

function without<T>(list: T[] | undefined, v: T): T[] | undefined {
  const next = (list ?? []).filter((x) => x !== v);
  return next.length ? next : undefined;
}

function listChips(
  key: keyof Pick<ListFilters, "brands" | "skinTypes" | "concerns" | "freeFrom" | "finish" | "sizes">,
  values: string[] | undefined,
  labelOf: (v: string) => string,
): ActiveChip[] {
  return (values ?? []).map((v) => ({
    key: `${key}:${v}`,
    label: labelOf(v),
    remove: (f) => ({ ...f, [key]: without(f[key], v) }),
  }));
}

/** "lumi-re-skin" -> "Lumi Re Skin" when the facet list has no label for a slug (e.g. zero results). */
function humanise(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function buildActiveChips(f: ListFilters, facets: Facets): ActiveChip[] {
  const brandName = (slug: string) => facets.brands.find((b) => b.value === slug)?.label ?? humanise(slug);
  const chips: ActiveChip[] = [
    ...listChips("brands", f.brands, brandName),
  ];
  if (f.priceMin !== undefined || f.priceMax !== undefined) {
    const lo = f.priceMin !== undefined ? formatINR(f.priceMin) : "₹0";
    const hi = f.priceMax !== undefined ? formatINR(f.priceMax) : "any";
    chips.push({ key: "price", label: `${lo} – ${hi}`, remove: (x) => ({ ...x, priceMin: undefined, priceMax: undefined }) });
  }
  if (f.discount !== undefined) chips.push({ key: "discount", label: `${f.discount}% off or more`, remove: (x) => ({ ...x, discount: undefined }) });
  if (f.rating !== undefined) chips.push({ key: "rating", label: `${f.rating}★ & up`, remove: (x) => ({ ...x, rating: undefined }) });
  chips.push(
    ...listChips("skinTypes", f.skinTypes, (v) => v),
    ...listChips("concerns", f.concerns, (v) => v),
    ...listChips("freeFrom", f.freeFrom, (v) => `${v}-free`),
    ...listChips("finish", f.finish, (v) => v),
    ...listChips("sizes", f.sizes, (v) => `Size ${v}`),
  );
  if (f.inStock) chips.push({ key: "in_stock", label: "In stock only", remove: (x) => ({ ...x, inStock: undefined }) });
  if (f.delivery && f.delivery !== "standard") {
    chips.push({ key: "delivery", label: DELIVERY_LABEL[f.delivery], remove: (x) => ({ ...x, delivery: undefined }) });
  }
  for (const o of f.offer ?? []) {
    chips.push({ key: `offer:${o}`, label: OFFER_LABEL[o], remove: (x) => ({ ...x, offer: without(x.offer, o) }) });
  }
  return chips;
}

export function clearAllFilters(f: ListFilters): ListFilters {
  return { q: f.q, category: f.category, sort: f.sort, pageSize: f.pageSize, pincode: f.pincode };
}

/** Removable chips under the sort/filter bar reflecting the active refinements. */
export function ActiveFilterChips({ filters, facets }: { filters: ListFilters; facets: Facets }) {
  const { apply } = useFilterNav();
  if (activeFilterCount(filters) === 0) return null;
  const chips = buildActiveChips(filters, facets);
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-none" aria-label="Active filters">
      {chips.map((c) => (
        <Chip
          key={c.key}
          size="sm"
          selected
          onClick={() => apply(c.remove(filters), { facet: "remove", value: c.key })}
          onRemove={() => apply(c.remove(filters), { facet: "remove", value: c.key })}
          aria-label={`Remove filter ${c.label}`}
          className="shrink-0"
        >
          {c.label}
        </Chip>
      ))}
      <button
        type="button"
        onClick={() => apply(clearAllFilters(filters), { facet: "clear_all" })}
        className="shrink-0 px-2 text-xs font-semibold text-primary min-h-0"
      >
        Clear all
      </button>
    </div>
  );
}
