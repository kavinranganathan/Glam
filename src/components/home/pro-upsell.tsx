"use client";

import { Crown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocalStorageFlag } from "@/lib/hooks/use-local-storage-flag";

export const PRO_UPSELL_DISMISSED_KEY = "glam_pro_upsell_dismissed";

/** Dismissible GLAM Pro upsell card at the bottom of the home feed (PRD §8.2.2 #11). */
export function ProUpsellCard() {
  const [dismissed, setDismissed] = useLocalStorageFlag(PRO_UPSELL_DISMISSED_KEY);
  if (dismissed) return null;
  return (
    <section aria-labelledby="pro-upsell-title" className="relative mx-4 my-6 rounded-card border border-secondary/30 bg-secondary-soft p-5 animate-fade-up">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss GLAM Pro offer"
        className="absolute right-2 top-2 rounded-full p-2.5 text-text-tertiary hover:bg-white hover:text-text"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-white">
          <Crown className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="pro-upsell-title" className="font-display text-lg font-bold text-text">
            Upgrade to GLAM Pro
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Extra savings on every order, free delivery with no minimum, early flash-sale access and 2× reward points — just ₹299/month.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button href="/pro" variant="secondary" size="sm">
              Explore Pro benefits
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDismissed(true)}>
              Maybe later
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
