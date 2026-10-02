"use client";

import * as React from "react";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/input";
import { activeFilterCount } from "@/lib/catalogue/search";
import type { FacetOption, Facets, ListFilters } from "@/lib/catalogue/types";
import { Sheet } from "@/components/ui/sheet";
import { clearAllFilters } from "./active-filter-chips";
import { BrandSection, ChipSection, PriceSection, ShadeSection, SingleSelect } from "./filter-sections";
import { formatCount } from "./params";
import { useFilterNav } from "./use-filter-nav";

type Delivery = NonNullable<ListFilters["delivery"]>;
type Offer = NonNullable<ListFilters["offer"]>[number];
type ListKey = "brands" | "skinTypes" | "concerns" | "freeFrom" | "finish" | "sizes";

const DISCOUNTS = [10, 20, 30, 50, 70].map((d) => ({ value: d, label: `${d}% & above` }));
const RATINGS = [
  { value: 4, label: "4★ & above" },
  { value: 3, label: "3★ & above" },
];
const DELIVERY: Array<{ value: Delivery; label: string }> = [
  { value: "same_day", label: "Same Day" },
  { value: "next_day", label: "Next Day" },
  { value: "standard", label: "Standard" },
];
const OFFERS: Array<{ value: Offer; label: string }> = [
  { value: "on_sale", label: "On Sale" },
  { value: "bxgy", label: "Buy X Get Y" },
  { value: "flash", label: "Flash Sale" },
];

function toggleIn(list: string[] | undefined, v: string): string[] | undefined {
  const next = list?.includes(v) ? list.filter((x) => x !== v) : [...(list ?? []), v];
  return next.length ? next : undefined;
}

/** Full facet sheet (PRD §8.3.3). Every change applies instantly through the URL. */
export function FilterPanel({ open, onClose, filters, facets, total }: { open: boolean; onClose: () => void; filters: ListFilters; facets: Facets; total: number }) {
  const { apply, pending } = useFilterNav();
  const [pincode, setPincode] = React.useState(filters.pincode ?? "");
  const shades: FacetOption[] | undefined = (facets as Facets & { shades?: FacetOption[] }).shades;
  const count = activeFilterCount(filters);

  const patch = (p: Partial<ListFilters>, facet: string, value?: string | number | boolean | string[]) =>
    apply({ ...filters, ...p }, { facet, value });
  const toggleList = (key: ListKey, v: string) => patch({ [key]: toggleIn(filters[key], v) }, key, v);

  const setDelivery = (d: Delivery | undefined) => {
    const pin = pincode.length === 6 ? pincode : filters.pincode;
    patch({ delivery: d, pincode: d && d !== "standard" ? pin : filters.pincode }, "delivery", d);
  };
  const onPincode = (raw: string) => {
    const v = raw.replace(/\D/g, "").slice(0, 6);
    setPincode(v);
    if (v.length === 6 && v !== filters.pincode) patch({ pincode: v }, "pincode", v);
  };

  const items: Array<{ id: string; title: string; content: React.ReactNode } | null> = [
    facets.brands.length
      ? { id: "brand", title: "Brand", content: <BrandSection options={facets.brands} selected={filters.brands ?? []} onToggle={(s) => toggleList("brands", s)} /> }
      : null,
    {
      id: "price",
      title: "Price",
      content: (
        <PriceSection
          key={`${filters.priceMin ?? ""}-${filters.priceMax ?? ""}`}
          min={filters.priceMin !== undefined ? filters.priceMin / 100 : undefined}
          max={filters.priceMax !== undefined ? filters.priceMax / 100 : undefined}
          onCommit={(lo, hi) => {
            const next = { priceMin: lo !== undefined ? lo * 100 : undefined, priceMax: hi !== undefined ? hi * 100 : undefined };
            if (next.priceMin !== filters.priceMin || next.priceMax !== filters.priceMax) patch(next, "price", `${lo ?? ""}-${hi ?? ""}`);
          }}
        />
      ),
    },
    { id: "discount", title: "Discount", content: <SingleSelect name="Discount" options={DISCOUNTS} value={filters.discount} onChange={(v) => patch({ discount: v }, "discount", v)} /> },
    {
      id: "rating",
      title: "Customer Rating",
      content: <SingleSelect name="Customer rating" options={[...RATINGS, { value: 0, label: "Any" }]} value={filters.rating ?? 0} onChange={(v) => patch({ rating: v ? v : undefined }, "rating", v)} />,
    },
    facets.skinTypes.length
      ? { id: "skin", title: "Skin Type", content: <ChipSection options={facets.skinTypes} selected={filters.skinTypes ?? []} onToggle={(v) => toggleList("skinTypes", v)} /> }
      : null,
    facets.concerns.length
      ? { id: "concern", title: "Skin Concern", content: <ChipSection options={facets.concerns} selected={filters.concerns ?? []} onToggle={(v) => toggleList("concerns", v)} /> }
      : null,
    facets.freeFrom.length
      ? { id: "free_from", title: "Ingredient-free", content: <ChipSection options={facets.freeFrom} selected={filters.freeFrom ?? []} onToggle={(v) => toggleList("freeFrom", v)} format={(l) => `${l}-free`} /> }
      : null,
    shades?.length ? { id: "shade", title: "Shade / Colour", content: <ShadeSection options={shades} selected={[]} onToggle={() => {}} /> } : null,
    facets.sizes.length
      ? { id: "size", title: "Size", content: <ChipSection options={facets.sizes} selected={filters.sizes ?? []} onToggle={(v) => toggleList("sizes", v)} /> }
      : null,
    facets.finish.length
      ? { id: "finish", title: "Finish", content: <ChipSection options={facets.finish} selected={filters.finish ?? []} onToggle={(v) => toggleList("finish", v)} /> }
      : null,
    {
      id: "availability",
      title: "Availability",
      content: <Toggle checked={Boolean(filters.inStock)} onChange={(v) => patch({ inStock: v || undefined }, "in_stock", v)} label="In Stock Only" description="Hide products that are sold out" />,
    },
    {
      id: "delivery",
      title: "Delivery",
      content: (
        <div className="flex flex-col gap-3">
          <SingleSelect name="Delivery speed" options={DELIVERY} value={filters.delivery} onChange={setDelivery} />
          {filters.delivery && filters.delivery !== "standard" && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-text-secondary">Deliver to pincode</span>
              <input
                value={pincode}
                onChange={(e) => onPincode(e.target.value)}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="6-digit pincode"
                aria-describedby="pincode-hint"
                className="h-11 rounded-input border border-border bg-background px-3 outline-none focus:ring-2 focus:ring-primary/40"
              />
              <span id="pincode-hint" className="text-xs text-text-tertiary">
                {pincode.length === 6 ? "Showing products deliverable to this pincode." : "Enter a pincode to check same/next-day availability."}
              </span>
            </label>
          )}
        </div>
      ),
    },
    {
      id: "offer",
      title: "Offers",
      content: (
        <div className="flex flex-wrap gap-2">
          {OFFERS.map((o) => (
            <OfferChip key={o.value} label={o.label} active={Boolean(filters.offer?.includes(o.value))} onClick={() => {
              const list = filters.offer ?? [];
              const next = list.includes(o.value) ? list.filter((x) => x !== o.value) : [...list, o.value];
              patch({ offer: next.length ? next : undefined }, "offer", o.value);
            }} />
          ))}
        </div>
      ),
    },
  ];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      desktop="side"
      size="md"
      title={count > 0 ? `Filters (${count})` : "Filters"}
      footer={
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex-1" disabled={count === 0} onClick={() => apply(clearAllFilters(filters), { facet: "clear_all" })}>
            Clear All
          </Button>
          <Button className="flex-[2]" loading={pending} onClick={onClose}>
            Show {formatCount(total)} {total === 1 ? "result" : "results"}
          </Button>
        </div>
      }
    >
      <Accordion items={items.filter((i): i is NonNullable<typeof i> => i !== null)} defaultOpen={["brand", "price"]} className="border-t-0" />
    </Sheet>
  );
}

function OfferChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`inline-flex h-10 items-center rounded-pill border px-4 text-sm font-medium transition-colors min-h-0 ${active ? "border-primary bg-primary-soft text-primary" : "border-border bg-background text-text-secondary hover:border-text-tertiary"}`}>
      {label}
    </button>
  );
}
