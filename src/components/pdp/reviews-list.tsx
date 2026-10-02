"use client";

import * as React from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Select } from "@/components/ui/input";
import { RatingStars } from "@/components/ui/rating-stars";
import { EmptyState } from "@/components/ui/empty-state";
import { SKIN_TYPES, CONCERNS } from "@/lib/account/beauty-profile";
import type { ReviewFilters, ReviewListResult, ReviewSort, ReviewView } from "@/lib/reviews/types";
import { cn } from "@/lib/utils/cn";
import { ReviewCard } from "./review-card";
import { WriteReviewCta } from "./write-review-cta";

const SORTS: Array<{ value: ReviewSort; label: string }> = [
  { value: "recent", label: "Most recent" },
  { value: "helpful", label: "Most helpful" },
  { value: "critical", label: "Critical first" },
];

function buildQuery(f: ReviewFilters): string {
  const p = new URLSearchParams();
  if (f.star) p.set("star", String(f.star));
  if (f.skinType) p.set("skin_type", f.skinType);
  if (f.concern) p.set("concern", f.concern);
  if (f.withPhotos) p.set("with_photos", "1");
  if (f.sort) p.set("sort", f.sort);
  if (f.page) p.set("page", String(f.page));
  return p.toString();
}

export function ReviewsList({
  productId,
  productName,
  initial,
  isLoggedIn,
  openReviewFor,
  ratingAvg,
  ratingCount,
}: {
  productId: string;
  productName: string;
  initial: ReviewListResult | null;
  isLoggedIn: boolean;
  openReviewFor: string | null;
  ratingAvg: number;
  ratingCount: number;
}) {
  const [filters, setFilters] = React.useState<ReviewFilters>({ sort: "recent" });
  const [data, setData] = React.useState<ReviewListResult | null>(initial);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(initial ? null : "Couldn't load reviews.");
  const isFiltered = Boolean(filters.star || filters.skinType || filters.concern || filters.withPhotos);

  const load = React.useCallback(
    async (next: ReviewFilters, append = false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/products/${productId}/reviews?${buildQuery(next)}`);
        if (!res.ok) throw new Error();
        const result = (await res.json()) as ReviewListResult;
        setData((prev) => (append && prev ? { ...result, items: [...prev.items, ...result.items] } : result));
      } catch {
        setError("Couldn't load reviews. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [productId],
  );

  const update = (patch: Partial<ReviewFilters>) => {
    const next = { ...filters, ...patch, page: 1 };
    setFilters(next);
    void load(next);
  };
  const loadMore = () => {
    const next = { ...filters, page: (data?.page ?? 1) + 1 };
    setFilters(next);
    void load(next, true);
  };
  const replaceReview = (r: ReviewView) => setData((d) => (d ? { ...d, items: d.items.map((x) => (x.id === r.id ? r : x)) } : d));

  const avg = data?.average ?? ratingAvg;
  const total = data?.totalAll ?? ratingCount;
  const histogram = data?.histogram ?? [];
  const hasMore = Boolean(data && data.items.length < data.total);

  return (
    <section id="reviews" className="scroll-mt-20 px-4 py-6" aria-labelledby="reviews-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h2 id="reviews-heading" className="font-display text-xl font-bold text-text">
          Ratings &amp; Reviews
        </h2>
        <WriteReviewCta productId={productId} productName={productName} isLoggedIn={isLoggedIn} openReviewFor={openReviewFor} onPosted={() => void load({ ...filters, page: 1 })} />
      </div>

      <div className="mt-4 grid gap-6 rounded-card border border-border p-4 md:grid-cols-[auto_1fr] md:items-center">
        <div className="flex flex-col items-start gap-1 md:pr-6 md:border-r md:border-border">
          <p className="font-display text-5xl font-bold text-text">{total ? avg.toFixed(1) : "–"}</p>
          <RatingStars value={avg} size={18} />
          <p className="text-sm text-text-tertiary">
            {total} {total === 1 ? "review" : "reviews"} · verified buyers only
          </p>
        </div>
        <ol className="space-y-1.5" aria-label="Rating breakdown">
          {histogram.map((h) => (
            <li key={h.star}>
              <button
                type="button"
                onClick={() => update({ star: filters.star === h.star ? undefined : h.star })}
                aria-pressed={filters.star === h.star}
                aria-label={`${h.star} star: ${h.count} reviews (${h.pct}%)`}
                className={cn("flex w-full items-center gap-3 rounded px-1 text-sm min-h-0 h-8", filters.star === h.star && "bg-primary-soft")}
              >
                <span className="w-8 shrink-0 text-left text-text-secondary">{h.star} ★</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                  <span className="block h-full rounded-full bg-amber-500" style={{ width: `${h.pct}%` }} />
                </span>
                <span className="w-10 shrink-0 text-right text-text-tertiary">{h.pct}%</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Chip size="sm" selected={Boolean(filters.withPhotos)} onClick={() => update({ withPhotos: !filters.withPhotos })}>
          <Camera className="h-3.5 w-3.5" aria-hidden /> With photos
        </Chip>
        <Select aria-label="Filter by skin type" value={filters.skinType ?? ""} onChange={(e) => update({ skinType: e.target.value || undefined })} className="w-40 [&>select]:h-9 [&>select]:text-sm">
          <option value="">All skin types</option>
          {SKIN_TYPES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select aria-label="Filter by concern" value={filters.concern ?? ""} onChange={(e) => update({ concern: e.target.value || undefined })} className="w-40 [&>select]:h-9 [&>select]:text-sm">
          <option value="">All concerns</option>
          {CONCERNS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select aria-label="Sort reviews" value={filters.sort ?? "recent"} onChange={(e) => update({ sort: e.target.value as ReviewSort })} className="ml-auto w-40 [&>select]:h-9 [&>select]:text-sm">
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        {isFiltered && (
          <Button variant="link" size="sm" onClick={() => update({ star: undefined, skinType: undefined, concern: undefined, withPhotos: false })}>
            Clear filters
          </Button>
        )}
      </div>

      <div className="mt-2" aria-live="polite" aria-busy={loading}>
        {error && (
          <p className="py-6 text-center text-sm text-error" role="alert">
            {error}{" "}
            <button type="button" className="font-semibold underline min-h-0" onClick={() => void load(filters)}>
              Retry
            </button>
          </p>
        )}
        {data && data.items.length === 0 && !error && (
          <EmptyState title={isFiltered ? "No reviews match these filters" : "No reviews yet"} description={isFiltered ? "Try clearing a filter." : "Be the first to share your experience once your order arrives."} />
        )}
        {data?.items.map((r) => (
          <ReviewCard key={r.id} review={r} isLoggedIn={isLoggedIn} onChange={replaceReview} />
        ))}
      </div>
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={loadMore} loading={loading}>
            Load more reviews
          </Button>
        </div>
      )}
    </section>
  );
}
