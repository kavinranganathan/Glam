"use client";

import * as React from "react";
import { BellRing } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useBadges } from "@/components/layout/badges-provider";

/** "Notify Me" for out-of-stock variants (PRD §8.5.6). */
export function NotifyMeButton({ variantId, compact, fullWidth }: { variantId: string; compact?: boolean; fullWidth?: boolean }) {
  const [done, setDone] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const { toast } = useToast();
  const badges = useBadges();
  const router = useRouter();

  const subscribe = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!badges.isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stock-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
      toast({ title: "We'll notify you when it's back", tone: "success" });
    } catch {
      toast({ title: "Couldn't set the alert", tone: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={subscribe}
        disabled={done || loading}
        className="inline-flex h-9 min-h-0 items-center gap-1 rounded-pill border border-border bg-white px-3 text-xs font-semibold text-text-secondary"
      >
        <BellRing className="h-3.5 w-3.5" aria-hidden /> {done ? "Alert set" : "Notify me"}
      </button>
    );
  }
  return (
    <Button variant="outline" fullWidth={fullWidth} onClick={subscribe} disabled={done} loading={loading} size="lg">
      <BellRing className="h-4 w-4" aria-hidden /> {done ? "We'll notify you" : "Notify Me"}
    </Button>
  );
}
