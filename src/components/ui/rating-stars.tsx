"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function RatingStars({
  value,
  size = 14,
  className,
  interactive,
  onChange,
}: {
  value: number;
  size?: number;
  className?: string;
  interactive?: boolean;
  onChange?: (v: number) => void;
}) {
  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role={interactive ? "radiogroup" : "img"}
      aria-label={interactive ? "Rating" : `${value.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        const star = (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star className="absolute inset-0 text-border" style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="text-amber-500" style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        );
        if (!interactive) return star;
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={Math.round(value) === i}
            aria-label={`${i} star${i > 1 ? "s" : ""}`}
            onClick={() => onChange?.(i)}
            className="p-1 min-h-0"
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}

export function RatingSummary({ avg, count, className }: { avg: number; count: number; className?: string }) {
  if (!count) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-text-secondary", className)}>
      <Star className="h-3.5 w-3.5 text-amber-500" fill="currentColor" strokeWidth={0} aria-hidden />
      <span className="font-semibold text-text">{Number(avg).toFixed(1)}</span>
      <span>({count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count})</span>
    </span>
  );
}
