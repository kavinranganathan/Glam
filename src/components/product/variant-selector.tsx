"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { formatINR } from "@/lib/utils/money";
import { usePdp } from "@/components/pdp/pdp-context";
import { NotifyMeButton } from "./notify-me";

/**
 * Shade swatch grid / size chips (PRD §8.5.4). Out-of-stock options stay selectable so the
 * shopper can set a back-in-stock alert for that exact variant.
 */
export function VariantSelector({ className }: { className?: string }) {
  const { variants, variant, select } = usePdp();
  if (variants.length <= 1 && variants[0]?.kind === "default") return null;
  const shades = variants.filter((v) => v.kind === "shade");
  const sizes = variants.filter((v) => v.kind !== "shade");
  const label = shades.length ? "Shade" : "Size";

  return (
    <section className={cn("flex flex-col gap-3", className)} aria-labelledby="variant-label">
      <p id="variant-label" className="text-sm text-text-secondary">
        {label}: <span className="font-semibold text-text">{variant.name}</span>
        {variant.stock === 0 && <span className="ml-2 text-xs font-semibold text-error">Out of stock</span>}
      </p>
      {shades.length > 0 && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Shade">
          {shades.map((v) => (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={v.id === variant.id}
              aria-label={`${v.name}${v.stock === 0 ? " (out of stock)" : ""}`}
              title={v.name}
              onClick={() => select(v.id)}
              className={cn(
                "relative h-11 w-11 rounded-full border-2 transition",
                v.id === variant.id ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-text-tertiary",
                v.stock === 0 && "opacity-50",
              )}
              style={{ background: v.shadeHex ?? "#ddd" }}
            >
              {v.stock === 0 && <span className="absolute inset-0 m-auto h-0.5 w-8 rotate-45 bg-text" aria-hidden />}
            </button>
          ))}
        </div>
      )}
      {sizes.length > 0 && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
          {sizes.map((v) => (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={v.id === variant.id}
              aria-label={`${v.name}, ${formatINR(v.price)}${v.stock === 0 ? " (out of stock)" : ""}`}
              onClick={() => select(v.id)}
              className={cn(
                "flex h-11 flex-col items-center justify-center rounded-pill border px-4 text-sm font-medium leading-tight",
                v.id === variant.id ? "border-primary bg-primary-soft text-primary" : "border-border text-text-secondary hover:border-text-tertiary",
                v.stock === 0 && "text-text-tertiary",
              )}
            >
              <span className={cn(v.stock === 0 && "line-through")}>{v.name}</span>
              {v.price !== variants[0].price && <span className="text-[11px] font-normal">{formatINR(v.price)}</span>}
            </button>
          ))}
        </div>
      )}
      {variant.stock === 0 && (
        <div className="rounded-card border border-border bg-surface p-3">
          <p className="mb-2 text-sm text-text-secondary">This option is sold out. We can let you know the moment it&apos;s back.</p>
          <NotifyMeButton variantId={variant.id} fullWidth />
        </div>
      )}
    </section>
  );
}
