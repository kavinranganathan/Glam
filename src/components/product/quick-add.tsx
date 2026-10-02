"use client";

import * as React from "react";
import Image from "next/image";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Price } from "@/components/ui/price";
import { cn } from "@/lib/utils/cn";
import { useCartActions } from "./use-cart-actions";
import type { ProductCard, VariantView } from "@/lib/catalogue/types";

/**
 * "+" quick add (PRD §8.4.2). Single-variant products add directly; multi-variant products open a
 * bottom sheet variant picker loaded lazily from the product API.
 */
export function QuickAdd({ product, className }: { product: ProductCard; className?: string }) {
  const { addToBag, pending } = useCartActions();
  const [open, setOpen] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [variants, setVariants] = React.useState<VariantView[] | null>(null);
  const [selected, setSelected] = React.useState<string | null>(null);

  const flash = async (promise: Promise<unknown>) => {
    await promise;
    setDone(true);
    setTimeout(() => setDone(false), 1200);
  };

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product.inStock) return;
    if (!product.hasVariants) {
      await flash(addToBag(product.defaultVariantId));
      return;
    }
    setOpen(true);
    if (!variants) {
      const res = await fetch(`/api/products/${product.slug}/variants`).catch(() => null);
      if (res?.ok) {
        const data = (await res.json()) as { variants: VariantView[] };
        setVariants(data.variants);
        setSelected(data.variants.find((v) => v.isDefault && v.stock > 0)?.id ?? data.variants.find((v) => v.stock > 0)?.id ?? null);
      }
    }
  };

  const current = variants?.find((v) => v.id === selected) ?? null;

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={!product.inStock || pending}
        aria-label={product.hasVariants ? "Choose options" : "Add to bag"}
        className={cn(
          "inline-flex h-9 w-9 min-h-0 items-center justify-center rounded-full bg-white shadow ring-1 ring-border transition-colors hover:bg-primary hover:text-white disabled:opacity-40",
          done && "bg-success text-white",
          className,
        )}
      >
        {done ? <Check className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Choose an option"
        desktop="modal"
        footer={
          <Button
            fullWidth
            disabled={!current || current.stock === 0}
            loading={pending}
            onClick={async () => {
              if (!current) return;
              await flash(addToBag(current.id));
              setOpen(false);
            }}
          >
            {current ? `Add to Bag · ₹${current.price / 100}` : "Add to Bag"}
          </Button>
        }
      >
        <div className="flex gap-3">
          <Image src={product.image} alt="" width={72} height={72} className="h-18 w-18 rounded-card object-cover bg-surface" />
          <div className="min-w-0">
            <p className="text-xs text-text-tertiary">{product.brand.name}</p>
            <p className="line-clamp-2 text-sm font-semibold">{product.name}</p>
            {current && <Price price={current.price} mrp={current.mrp} size="sm" className="mt-1" />}
          </div>
        </div>
        <div className="mt-4">
          {!variants ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-10 w-20 rounded-pill" />
              ))}
            </div>
          ) : (
            <VariantChips variants={variants} selected={selected} onSelect={setSelected} />
          )}
        </div>
      </Sheet>
    </>
  );
}

export function VariantChips({
  variants,
  selected,
  onSelect,
}: {
  variants: VariantView[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const shades = variants.filter((v) => v.kind === "shade");
  const current = variants.find((v) => v.id === selected);
  if (shades.length) {
    return (
      <div>
        <p className="mb-2 text-sm text-text-secondary">
          Selected: <span className="font-semibold text-text">{current?.name ?? "—"}</span>
        </p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Shade">
          {shades.map((v) => (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={v.id === selected}
              aria-label={`${v.name}${v.stock === 0 ? " (out of stock)" : ""}`}
              title={v.name}
              onClick={() => onSelect(v.id)}
              className={cn(
                "relative h-11 w-11 rounded-full border-2 transition",
                v.id === selected ? "border-primary ring-2 ring-primary/30" : "border-border",
                v.stock === 0 && "opacity-40",
              )}
              style={{ background: v.shadeHex ?? "#ddd" }}
            >
              {v.stock === 0 && <span className="absolute inset-0 m-auto h-0.5 w-8 rotate-45 bg-text" aria-hidden />}
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
      {variants.map((v) => (
        <button
          key={v.id}
          type="button"
          role="radio"
          aria-checked={v.id === selected}
          onClick={() => onSelect(v.id)}
          disabled={v.stock === 0 && v.id !== selected}
          className={cn(
            "h-10 rounded-pill border px-4 text-sm font-medium min-h-0",
            v.id === selected ? "border-primary bg-primary-soft text-primary" : "border-border",
            v.stock === 0 && "line-through text-text-tertiary",
          )}
        >
          {v.name}
        </button>
      ))}
    </div>
  );
}
