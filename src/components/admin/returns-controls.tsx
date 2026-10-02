"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/sheet";
import { Input, Textarea } from "@/components/ui/input";
import type { ReturnStatus } from "@/lib/admin/rules";
import { RETURN_STATUS_LABEL } from "@/lib/returns/policy";
import { useAdminApi } from "./use-admin-api";

const NOTE_HINT: Partial<Record<ReturnStatus, string>> = {
  pickup_scheduled: "e.g. Delhivery pickup tomorrow 10am–2pm",
  picked_up: "e.g. Picked up, AWB scanned",
  received: "e.g. QC passed at Bhiwandi FC",
  refunded: "e.g. Refund initiated to original method",
};

/** Next-status buttons for a return, with reject-with-note confirmation. */
export function ReturnsControls({ returnId, status, nextStatuses }: { returnId: string; status: ReturnStatus; nextStatuses: ReturnStatus[] }) {
  const { call, busy } = useAdminApi();
  const [note, setNote] = React.useState("");
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejectNote, setRejectNote] = React.useState("");
  const forward = nextStatuses.filter((s) => s !== "rejected");
  const canReject = nextStatuses.includes("rejected");

  const advance = async (to: ReturnStatus, n?: string) => {
    const res = await call("POST", `/api/admin/returns/${returnId}`, { status: to, note: n || undefined }, { success: `Return marked ${RETURN_STATUS_LABEL[to]}` });
    if (res) setNote("");
  };

  return (
    <section aria-labelledby="return-actions" className="rounded-card border border-border bg-background p-4">
      <h2 id="return-actions" className="font-display text-base font-semibold">
        Actions
      </h2>
      {forward.length > 0 ? (
        <div className="mt-3 flex flex-col gap-3">
          <Input label="Note (optional)" placeholder={NOTE_HINT[forward[0]]} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          <div className="flex flex-wrap gap-2">
            {forward.map((s) => (
              <Button key={s} size="sm" disabled={busy} onClick={() => advance(s, note)}>
                Mark {RETURN_STATUS_LABEL[s]}
              </Button>
            ))}
            {canReject && (
              <Button size="sm" variant="danger" disabled={busy} onClick={() => setRejectOpen(true)}>
                Reject return
              </Button>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-text-tertiary">This return is {RETURN_STATUS_LABEL[status]?.toLowerCase()}; no further changes.</p>
      )}

      <Dialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject this return?"
        description="The order goes back to Delivered and the customer is notified with your note."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setRejectOpen(false)}>
              Back
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={busy || rejectNote.trim().length < 3}
              onClick={async () => {
                await advance("rejected", rejectNote.trim());
                setRejectOpen(false);
                setRejectNote("");
              }}
            >
              Reject
            </Button>
          </>
        }
      >
        <Textarea label="Reason shown to customer" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} maxLength={500} placeholder="e.g. Item shows signs of use beyond trial" />
      </Dialog>
    </section>
  );
}
