"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/sheet";
import { Input, Textarea } from "@/components/ui/input";
import { nextStatusesFor, type SimulationStep } from "@/lib/admin/rules";
import { STATUS_LABEL, type OrderStatus } from "@/lib/orders/state-machine";
import { useAdminApi } from "./use-admin-api";

interface Props {
  orderId: string;
  status: OrderStatus;
  paymentStatus: string;
  simulationSteps: SimulationStep[];
}

/** Transition buttons (allowed next states only), simulate fulfilment, confirm payment and cancel with reason. */
export function OrderStatusControls({ orderId, status, paymentStatus, simulationSteps }: Props) {
  const { call, busy } = useAdminApi();
  const [note, setNote] = React.useState("");
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const base = `/api/admin/orders/${orderId}`;
  const nexts = nextStatusesFor(status).filter((s) => s !== "cancelled");
  const canCancel = nextStatusesFor(status).includes("cancelled");

  const advance = async (to: OrderStatus, n?: string) => {
    const res = await call("POST", `${base}/advance`, { status: to, note: n || undefined }, { success: `Order marked ${STATUS_LABEL[to]}` });
    if (res) setNote("");
  };

  return (
    <section aria-labelledby="order-actions" className="rounded-card border border-border bg-background p-4">
      <h2 id="order-actions" className="font-display text-base font-semibold">
        Actions
      </h2>

      {nexts.length > 0 ? (
        <div className="mt-3 flex flex-col gap-3">
          <Input label="Note (optional)" placeholder="e.g. Packed at Bhiwandi FC" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          <div className="flex flex-wrap gap-2">
            {nexts.map((s) => (
              <Button key={s} size="sm" variant={s === "failed_delivery" ? "outline" : "primary"} disabled={busy} onClick={() => advance(s, note)}>
                Mark {STATUS_LABEL[s]}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-text-tertiary">No further status changes are allowed from {STATUS_LABEL[status]}.</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {simulationSteps.length > 0 && (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => call("POST", `${base}/simulate`, undefined, { success: "Fulfilment simulated through delivery" })}
            title={simulationSteps.map((s) => `${STATUS_LABEL[s.status]} — ${s.note}`).join("\n")}
          >
            Simulate fulfilment ({simulationSteps.length} step{simulationSteps.length > 1 ? "s" : ""})
          </Button>
        )}
        {paymentStatus === "pending" && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => call("POST", `${base}/confirm-payment`, undefined, { success: "Payment marked received" })}>
            Mark payment received
          </Button>
        )}
        {canCancel && (
          <Button size="sm" variant="danger" disabled={busy} onClick={() => setCancelOpen(true)}>
            Cancel order
          </Button>
        )}
      </div>

      <Dialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this order?"
        description="Stock, coupon usage and points are restored. Paid orders are refunded to the customer's GLAM wallet."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setCancelOpen(false)}>
              Keep order
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={busy || reason.trim().length < 3}
              onClick={async () => {
                await advance("cancelled", reason.trim());
                setCancelOpen(false);
                setReason("");
              }}
            >
              Cancel order
            </Button>
          </>
        }
      >
        <Textarea label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer requested cancellation" maxLength={500} />
      </Dialog>
    </section>
  );
}
