"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/** "Join GLAM Pro" / "Extend 1 month" → POST /api/pro/subscribe → simulated payment page. */
export function ProJoinButton({ isLoggedIn, isPro }: { isLoggedIn: boolean; isPro: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  const start = async () => {
    if (!isLoggedIn) {
      router.push("/login?next=/pro");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/pro/subscribe", { method: "POST" });
      const json = (await res.json()) as { redirectUrl?: string; error?: { message: string } };
      if (!res.ok || !json.redirectUrl) throw new Error(json.error?.message ?? "Could not start subscription");
      router.push(json.redirectUrl);
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Could not start subscription", tone: "error" });
      setBusy(false);
    }
  };

  return (
    <Button size="lg" variant="secondary" onClick={start} loading={busy} fullWidth>
      <Sparkles className="h-5 w-5" aria-hidden />
      {isPro ? "Extend 1 month · ₹299" : "Join GLAM Pro · ₹299/month"}
    </Button>
  );
}
