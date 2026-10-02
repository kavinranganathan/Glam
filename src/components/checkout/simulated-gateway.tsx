"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Lock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { PaymentOrderView, PaymentOutcome } from "@/lib/orders/types";
import { PAYMENT_METHOD_LABEL, PAYMENT_METHODS_ORDERED } from "@/lib/payments/provider";
import type { PaymentMethod } from "@/lib/pricing/types";
import { formatINR } from "@/lib/utils/money";
import { GatewayMethodPanel } from "./gateway-method-ui";

interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

export function SimulatedGateway({ order: initial }: { order: PaymentOrderView }) {
  const router = useRouter();
  const { toast } = useToast();
  const [order, setOrder] = React.useState(initial);
  const [ready, setReady] = React.useState(false);
  const [busy, setBusy] = React.useState<"success" | "failure" | "method" | null>(null);
  const [lastFailure, setLastFailure] = React.useState<PaymentOutcome | null>(null);
  const [changing, setChanging] = React.useState(false);
  const [nextMethod, setNextMethod] = React.useState<PaymentMethod>(initial.paymentMethod);

  const cancelled = order.status === "cancelled" || order.paymentStatus === "failed";
  const isCod = order.paymentMethod === "cod";

  const submit = async (outcome: "success" | "failure") => {
    setBusy(outcome);
    try {
      const res = await fetch(`/api/payments/${order.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ outcome }) });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
        toast({ title: body?.error?.message ?? "Payment could not be processed", tone: "error" });
        return;
      }
      const result = (await res.json()) as PaymentOutcome;
      if (result.redirectUrl) {
        router.push(result.redirectUrl);
        return;
      }
      setLastFailure(result);
      setOrder((o) => ({ ...o, attemptsLeft: result.attemptsLeft, paymentAttempts: o.paymentAttempts + 1, status: result.cancelled ? "cancelled" : o.status, paymentStatus: result.cancelled ? "failed" : o.paymentStatus }));
    } catch {
      toast({ title: "Network error. Please try again.", tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  const changeMethod = async () => {
    if (nextMethod === order.paymentMethod) {
      setChanging(false);
      return;
    }
    setBusy("method");
    try {
      const res = await fetch(`/api/payments/${order.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method: nextMethod }) });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
        toast({ title: body?.error?.message ?? "Couldn't change the payment method", tone: "error" });
        return;
      }
      setOrder((await res.json()) as PaymentOrderView);
      setLastFailure(null);
      setChanging(false);
      setReady(false);
      toast({ title: `Switched to ${PAYMENT_METHOD_LABEL[nextMethod]}`, tone: "success" });
    } finally {
      setBusy(null);
    }
  };

  if (cancelled) {
    return (
      <EmptyState
        icon={<XCircle className="h-8 w-8" aria-hidden />}
        title="Payment failed"
        description={`Order ${order.orderNumber} was cancelled after 3 unsuccessful attempts. Nothing was charged and your items are back in stock — you can try again from your bag.`}
        action={{ label: "Back to bag", href: "/bag" }}
        secondary={{ label: "Continue shopping", href: "/" }}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-6">
      <div className="rounded-card border border-border bg-background p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-text-tertiary">Paying GLAM</p>
            <p className="font-display text-3xl font-bold tabular-nums">{formatINR(order.total)}</p>
            <p className="mt-1 text-sm text-text-secondary">
              Order {order.orderNumber} · {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-pill bg-surface px-3 py-1 text-xs font-semibold text-text-secondary">
            <Lock className="h-3.5 w-3.5" aria-hidden /> {PAYMENT_METHOD_LABEL[order.paymentMethod]}
          </span>
        </div>
        {lastFailure && (
          <div className="mt-3 flex items-start gap-2 rounded-card border border-error/30 bg-error-soft p-3 text-sm text-error" role="alert">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>
              Payment failed. You have {lastFailure.attemptsLeft} {lastFailure.attemptsLeft === 1 ? "attempt" : "attempts"} left before this order is cancelled. Retry below or change your payment method.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-card border border-border bg-background p-4">
        {changing ? (
          <div className="flex flex-col gap-3">
            <Select label="Pay with" value={nextMethod} onChange={(e) => setNextMethod(e.target.value as PaymentMethod)}>
              {PAYMENT_METHODS_ORDERED.map((m) => (
                <option key={m} value={m} disabled={Boolean(order.methodIssues[m])}>
                  {PAYMENT_METHOD_LABEL[m]}
                  {order.methodIssues[m] ? ` — ${order.methodIssues[m]}` : ""}
                </option>
              ))}
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setChanging(false)}>
                Cancel
              </Button>
              <Button className="flex-1" loading={busy === "method"} onClick={() => void changeMethod()}>
                Use this method
              </Button>
            </div>
          </div>
        ) : (
          <GatewayMethodPanel key={order.paymentMethod} method={order.paymentMethod} amount={order.total} onReady={setReady} />
        )}
      </div>

      {!changing && (
        <div className="flex flex-col gap-2">
          <Button size="lg" fullWidth disabled={!ready || busy !== null} loading={busy === "success"} onClick={() => void submit("success")}>
            {isCod ? "Confirm order" : order.paymentMethod === "upi" ? `I've paid ${formatINR(order.total)}` : `Pay ${formatINR(order.total)}`}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={busy !== null} loading={busy === "failure"} onClick={() => void submit("failure")}>
              Simulate failure
            </Button>
            <Button variant="ghost" className="flex-1" disabled={busy !== null} onClick={() => setChanging(true)}>
              Change method
            </Button>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-text-tertiary">Simulated gateway — no real money moves. {order.attemptsLeft} of 3 attempts remaining.</p>
    </div>
  );
}
