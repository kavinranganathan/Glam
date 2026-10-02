"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileText, RotateCcw, ShoppingBag, Undo2, Wallet, CalendarClock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { OrderAction } from "@/lib/orders/state-machine";
import type { OrderDetail } from "@/lib/orders/views";
import { CancelDialog } from "./cancel-dialog";
import { RescheduleDialog } from "./reschedule-dialog";
import { TrackingSheet } from "./tracking-sheet";

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { code: string; message: string } };
  if (!res.ok) throw new Error(json.error?.message ?? "Something went wrong. Please try again.");
  return json;
}

/** Action bar for the order detail page; renders only the actions returned by `availableActions`. */
export function OrderActions({ order, rescheduleDates, canReturn }: { order: OrderDetail; rescheduleDates: string[]; canReturn: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [rescheduleOpen, setRescheduleOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<OrderAction | null>(null);
  const [dialogError, setDialogError] = React.useState<string | null>(null);
  const actions = new Set<OrderAction>(order.actions);

  const run = async (action: OrderAction, fn: () => Promise<void>) => {
    setBusy(action);
    setDialogError(null);
    try {
      await fn();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong.";
      if (action === "cancel" || action === "reschedule") setDialogError(message);
      else toast({ title: message, tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  const onCancel = (reason: string) =>
    run("cancel", async () => {
      await post(`/api/orders/${order.id}/cancel`, { reason });
      setCancelOpen(false);
      toast({ title: "Order cancelled", description: order.paymentStatus === "paid" ? "Refund credited to your GLAM wallet." : undefined, tone: "success" });
      router.refresh();
    });

  const onReorder = () =>
    run("reorder", async () => {
      const r = await post<{ added: number; skipped: string[] }>(`/api/orders/${order.id}/reorder`);
      if (r.added === 0) {
        toast({ title: "Nothing added", description: r.skipped.length ? `Unavailable: ${r.skipped.join(", ")}` : undefined, tone: "warning" });
        return;
      }
      toast({
        title: `${r.added} item${r.added === 1 ? "" : "s"} added to your bag`,
        description: r.skipped.length ? `Skipped (unavailable): ${r.skipped.join(", ")}` : undefined,
        tone: r.skipped.length ? "warning" : "success",
      });
      router.push("/bag");
    });

  const onReschedule = (date: string) =>
    run("reschedule", async () => {
      await post(`/api/orders/${order.id}/reschedule`, { date });
      setRescheduleOpen(false);
      toast({ title: "Reschedule requested", tone: "success" });
      router.refresh();
    });

  return (
    <div className="flex flex-wrap gap-2" aria-label="Order actions">
      {actions.has("cancel") && (
        <Button variant="outline" onClick={() => setCancelOpen(true)} className="text-error border-error/40 hover:bg-error-soft">
          <XCircle className="h-4 w-4" aria-hidden /> Cancel order
        </Button>
      )}
      {actions.has("track") && (
        <TrackingSheet orderNumber={order.orderNumber} courier={order.courier} awb={order.awb} events={order.events} estimatedDelivery={order.estimatedDelivery} />
      )}
      {actions.has("return") && canReturn && (
        <Button href={`/orders/${order.id}/return`}>
          <Undo2 className="h-4 w-4" aria-hidden /> Return items
        </Button>
      )}
      {actions.has("reschedule") && (
        <Button onClick={() => setRescheduleOpen(true)}>
          <CalendarClock className="h-4 w-4" aria-hidden /> Reschedule
        </Button>
      )}
      {actions.has("reorder") && (
        <Button variant={actions.has("return") ? "outline" : "primary"} onClick={onReorder} loading={busy === "reorder"}>
          <ShoppingBag className="h-4 w-4" aria-hidden /> Reorder
        </Button>
      )}
      {actions.has("view_refund") && (
        <Button variant="outline" href={`/orders/${order.id}#returns`}>
          <Wallet className="h-4 w-4" aria-hidden /> View refund
        </Button>
      )}
      {actions.has("invoice") && (
        <a
          href={`/orders/${order.id}/invoice`}
          target="_blank"
          rel="noopener"
          className="btn inline-flex h-11 items-center gap-2 rounded-pill border border-border bg-background px-5 text-sm font-semibold text-text hover:bg-surface"
        >
          <FileText className="h-4 w-4" aria-hidden /> Invoice
        </a>
      )}
      {actions.has("review") && (
        <Button variant="ghost" href="#items">
          <RotateCcw className="h-4 w-4 rotate-180" aria-hidden /> Rate &amp; review
        </Button>
      )}

      <CancelDialog key={`cancel-${cancelOpen}`} open={cancelOpen} onClose={() => setCancelOpen(false)} onConfirm={onCancel} busy={busy === "cancel"} error={dialogError} />
      <RescheduleDialog
        key={`reschedule-${rescheduleOpen}`}
        open={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        dates={rescheduleDates}
        onConfirm={onReschedule}
        busy={busy === "reschedule"}
        error={dialogError}
      />
    </div>
  );
}
