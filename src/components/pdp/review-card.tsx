"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ThumbsUp, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/ui/rating-stars";
import { useToast } from "@/components/ui/toast";
import { formatShortDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { ReviewView } from "@/lib/reviews/types";
import { Lightbox } from "@/components/product/lightbox";

export function ReviewCard({ review, isLoggedIn, onChange }: { review: ReviewView; isLoggedIn: boolean; onChange: (next: ReviewView) => void }) {
  const [lightbox, setLightbox] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const toggleHelpful = async () => {
    if (!isLoggedIn) {
      toast({ title: "Sign in to vote", tone: "info" });
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const optimistic: ReviewView = {
      ...review,
      helpfulByMe: !review.helpfulByMe,
      helpfulCount: review.helpfulCount + (review.helpfulByMe ? -1 : 1),
    };
    onChange(optimistic);
    setBusy(true);
    try {
      const res = await fetch(`/api/reviews/${review.id}/helpful`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { helpful: boolean; count: number };
      onChange({ ...review, helpfulByMe: data.helpful, helpfulCount: data.count });
    } catch {
      onChange(review);
      toast({ title: "Couldn't record your vote", tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="border-b border-border py-5 last:border-b-0" aria-label={`Review by ${review.authorName}`}>
      <header className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary" aria-hidden>
          {review.authorName[0]?.toUpperCase() ?? "G"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-text">{review.authorName}</span>
            {review.verified && (
              <Badge tone="success" className="min-h-0">
                Verified Purchase
              </Badge>
            )}
            <time dateTime={review.createdAt} className="text-xs text-text-tertiary">
              {formatShortDate(review.createdAt)}
            </time>
          </div>
          <RatingStars value={review.rating} size={14} className="mt-1" />
        </div>
      </header>
      {review.title && <h3 className="mt-3 font-semibold text-text">{review.title}</h3>}
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-text-secondary">{review.body}</p>
      {review.photos.length > 0 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto scrollbar-none" aria-label="Review photos">
          {review.photos.map((src, i) => (
            <li key={src} className="shrink-0">
              <button
                type="button"
                onClick={() => setLightbox(i)}
                aria-label={`Open review photo ${i + 1}`}
                className="relative block h-20 w-20 overflow-hidden rounded-card bg-surface min-h-0"
              >
                <Image src={src} alt={`Photo ${i + 1} from ${review.authorName}'s review`} fill sizes="80px" className="object-cover" unoptimized />
              </button>
            </li>
          ))}
        </ul>
      )}
      {(review.skinType || review.concerns.length > 0) && (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Reviewer profile">
          {review.skinType && (
            <li>
              <Badge tone="neutral">{review.skinType} skin</Badge>
            </li>
          )}
          {review.concerns.map((c) => (
            <li key={c}>
              <Badge tone="neutral">{c}</Badge>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3">
        <button
          type="button"
          onClick={toggleHelpful}
          disabled={busy}
          aria-pressed={review.helpfulByMe}
          className={cn(
            "inline-flex h-9 min-h-0 items-center gap-1.5 rounded-pill border px-3 text-xs font-semibold transition-colors",
            review.helpfulByMe ? "border-primary bg-primary-soft text-primary" : "border-border text-text-secondary hover:border-text-tertiary",
          )}
        >
          <ThumbsUp className="h-3.5 w-3.5" aria-hidden /> Helpful ({review.helpfulCount})
        </button>
      </div>
      {review.brandResponse && (
        <div className="mt-3 rounded-card border-l-4 border-secondary bg-secondary-soft p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-secondary">
            <Store className="h-3.5 w-3.5" aria-hidden /> Response from the brand
            {review.brandRespondedAt && <span className="font-normal text-text-tertiary">· {formatShortDate(review.brandRespondedAt)}</span>}
          </p>
          <p className="mt-1 text-sm text-text-secondary">{review.brandResponse}</p>
        </div>
      )}
      {lightbox !== null && (
        <Lightbox images={review.photos} index={lightbox} onIndexChange={setLightbox} onClose={() => setLightbox(null)} alt={`${review.authorName}'s review photo`} />
      )}
    </article>
  );
}
