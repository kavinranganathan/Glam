"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useToast } from "@/components/ui/toast";
import { useBadges } from "@/components/layout/badges-provider";
import { useWishlistState } from "./wishlist-state";
import { track } from "@/lib/analytics/track";

/** Heart toggle (PRD §8.4.2 / §8.5.6). Optimistic; pulses on fill. Guests are sent to login. */
export function WishlistButton({
  productId,
  variantId,
  className,
  size = "md",
  showLabel,
}: {
  productId: string;
  variantId?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}) {
  const { has, set } = useWishlistState();
  const wishlisted = has(productId);
  const [pulse, setPulse] = React.useState(false);
  const { toast } = useToast();
  const badges = useBadges();
  const router = useRouter();

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!badges.isLoggedIn) {
      toast({ title: "Sign in to save items", description: "Your wishlist syncs across devices once you sign in.", tone: "info" });
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const next = !wishlisted;
    set(productId, next);
    if (next) setPulse(true);
    try {
      const res = await fetch("/api/wishlist/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, variantId: variantId ?? null }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { wishlisted: boolean };
      set(productId, data.wishlisted);
      if (data.wishlisted) track("wishlist_add", { sku_id: productId, source_screen: window.location.pathname });
      toast({
        title: data.wishlisted ? "Saved to wishlist" : "Removed from wishlist",
        tone: "success",
        action: data.wishlisted ? { label: "View wishlist", href: "/wishlist" } : undefined,
      });
      void badges.refresh();
    } catch {
      set(productId, !next);
      toast({ title: "Couldn't update wishlist", tone: "error" });
    } finally {
      setTimeout(() => setPulse(false), 350);
    }
  };

  const dim = size === "lg" ? "h-6 w-6" : size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={wishlisted}
      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full bg-white/90 shadow-sm transition-colors hover:bg-white",
        showLabel ? "px-4 h-11" : size === "sm" ? "h-9 w-9 min-h-0" : "h-11 w-11",
        className,
      )}
    >
      <Heart
        className={cn(dim, wishlisted ? "text-primary" : "text-text-secondary", pulse && "animate-heart")}
        fill={wishlisted ? "currentColor" : "none"}
        aria-hidden
      />
      {showLabel && <span className="text-sm font-semibold">{wishlisted ? "Wishlisted" : "Wishlist"}</span>}
    </button>
  );
}
