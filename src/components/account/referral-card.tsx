"use client";

import * as React from "react";
import { Copy, Share2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { REFERRAL_POINTS } from "@/lib/loyalty/points";

/** S37 referral block: code, copy, Web Share (falls back to copying the link). */
export function ReferralCard({ code, siteUrl }: { code: string; siteUrl: string }) {
  const { toast } = useToast();
  const link = `${siteUrl.replace(/\/$/, "")}/login?ref=${encodeURIComponent(code)}`;

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copied`, tone: "success" });
    } catch {
      toast({ title: `Copy failed — your ${label.toLowerCase()} is ${text}`, tone: "warning" });
    }
  };

  const share = async () => {
    const data = { title: "Join me on GLAM", text: `Use my code ${code} for a welcome treat on GLAM.`, url: link };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        // user dismissed the share sheet
        return;
      }
    }
    await copy(link, "Referral link");
  };

  return (
    <section className="rounded-card border border-border p-4" aria-labelledby="referral">
      <h2 id="referral" className="flex items-center gap-2 font-display text-lg font-semibold">
        <Users className="h-5 w-5 text-primary" aria-hidden /> Refer a friend
      </h2>
      <p className="mt-1 text-sm text-text-secondary">Earn {REFERRAL_POINTS} points when a friend&apos;s first order is ≥ ₹500. They get a welcome coupon too.</p>
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 rounded-input border border-dashed border-primary bg-primary-soft px-3 py-2.5 text-center font-mono text-base font-bold tracking-widest text-primary" aria-label={`Referral code ${code}`}>
          {code}
        </code>
        <Button variant="outline" size="icon" aria-label="Copy referral code" onClick={() => copy(code, "Code")}>
          <Copy className="h-5 w-5" aria-hidden />
        </Button>
      </div>
      <Button className="mt-3" fullWidth onClick={share}>
        <Share2 className="h-4 w-4" aria-hidden /> Share invite link
      </Button>
      <p className="mt-2 break-all text-xs text-text-tertiary">{link}</p>
    </section>
  );
}
