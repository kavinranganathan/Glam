"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { eligibilityMessage } from "@/lib/reviews/eligibility";
import type { ReviewEligibilityResponse } from "@/lib/reviews/types";
import { ReviewForm } from "./review-form";

async function fetchEligibility(productId: string): Promise<ReviewEligibilityResponse | null> {
  try {
    const res = await fetch(`/api/products/${productId}/reviews/eligibility`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as ReviewEligibilityResponse;
  } catch {
    return null;
  }
}

/** "Write a Review" gate: asks the eligibility endpoint and explains the outcome (PRD §8.5.8). */
export function WriteReviewCta({
  productId,
  productName,
  isLoggedIn,
  openReviewFor,
  onPosted,
}: {
  productId: string;
  productName: string;
  isLoggedIn: boolean;
  openReviewFor: string | null;
  onPosted: () => void;
}) {
  const [state, setState] = React.useState<ReviewEligibilityResponse | null>(null);
  const [checking, setChecking] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [posted, setPosted] = React.useState(false);
  const router = useRouter();

  const check = React.useCallback(async (): Promise<ReviewEligibilityResponse | null> => {
    setChecking(true);
    const data = await fetchEligibility(productId);
    setState(data ?? { eligible: false, orderItemId: null, reason: null });
    setChecking(false);
    return data;
  }, [productId]);

  // Deep link from the review-prompt notification: open the form immediately when eligible.
  React.useEffect(() => {
    if (!openReviewFor || !isLoggedIn) return;
    let cancelled = false;
    fetchEligibility(productId).then((data) => {
      if (cancelled) return;
      setState(data ?? { eligible: false, orderItemId: null, reason: null });
      if (data?.eligible) setOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [openReviewFor, isLoggedIn, productId]);

  const onClick = async () => {
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    const data = state ?? (await check());
    if (data?.eligible) setOpen(true);
  };

  const message = posted ? "Thanks! Your review is live." : state && !state.eligible ? eligibilityMessage(state.reason) || "Reviews are unavailable right now." : null;

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <Button variant="outline" onClick={onClick} loading={checking} disabled={posted}>
        <PenLine className="h-4 w-4" aria-hidden /> Write a Review
      </Button>
      {message && (
        <p className="max-w-xs text-xs text-text-tertiary sm:text-right" role="status">
          {message}
        </p>
      )}
      {open && state?.eligible && state.orderItemId && (
        <ReviewForm
          productId={productId}
          productName={productName}
          orderItemId={openReviewFor && openReviewFor === state.orderItemId ? openReviewFor : state.orderItemId}
          open={open}
          onClose={() => setOpen(false)}
          onPosted={() => {
            setOpen(false);
            setPosted(true);
            setState({ eligible: false, orderItemId: null, reason: "already_reviewed" });
            onPosted();
          }}
        />
      )}
    </div>
  );
}
