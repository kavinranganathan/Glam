"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Smartphone, Wallet, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { useToast } from "@/components/ui/toast";
import { formatINR } from "@/lib/utils/money";

type Method = "upi" | "card" | "wallet";
const METHODS: Array<{ value: Method; label: string; Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }> }> = [
  { value: "upi", label: "UPI", Icon: Smartphone },
  { value: "card", label: "Card", Icon: CreditCard },
  { value: "wallet", label: "Wallet", Icon: Wallet },
];

/** Simulated gateway for GLAM Pro: pick a method, Pay or Simulate failure → POST /api/pro/confirm. */
export function ProPayForm({ amount }: { amount: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [method, setMethod] = React.useState<Method>("upi");
  const [busy, setBusy] = React.useState<"success" | "failure" | null>(null);
  const [failure, setFailure] = React.useState<string | null>(null);

  const confirm = async (outcome: "success" | "failure") => {
    setBusy(outcome);
    setFailure(null);
    try {
      const res = await fetch("/api/pro/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ outcome, method }) });
      const json = (await res.json()) as { redirectUrl?: string; error?: { message: string } };
      if (!res.ok) throw new Error(json.error?.message ?? "Payment failed");
      toast({ title: "Welcome to GLAM Pro", description: "Your benefits are live right away.", tone: "success" });
      router.push(json.redirectUrl ?? "/pro?welcome=1");
      router.refresh();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : "Payment failed");
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 rounded-card border border-border bg-background p-5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-text-secondary">GLAM Pro · 1 month</span>
        <span className="font-display text-2xl font-bold text-text">{formatINR(amount)}</span>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-text-secondary">Pay with</legend>
        <div className="flex flex-wrap gap-2">
          {METHODS.map(({ value, label, Icon }) => (
            <Chip key={value} selected={method === value} onClick={() => setMethod(value)} aria-label={label}>
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </Chip>
          ))}
        </div>
      </fieldset>
      {failure && (
        <div role="alert" className="flex items-start gap-2 rounded-card border border-error/40 bg-error-soft p-3 text-sm text-error">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {failure} <span className="block text-text-secondary">Try again or pick another method.</span>
          </span>
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="lg" variant="secondary" fullWidth onClick={() => confirm("success")} loading={busy === "success"} disabled={busy === "failure"}>
          Pay {formatINR(amount)}
        </Button>
        <Button size="lg" variant="outline" fullWidth onClick={() => confirm("failure")} loading={busy === "failure"} disabled={busy === "success"}>
          Simulate failure
        </Button>
      </div>
      <p className="text-xs text-text-tertiary">This is a simulated gateway — no money moves. Renewal is manual: extend any time from the Pro page.</p>
    </div>
  );
}
