"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Dialog } from "@/components/ui/sheet";

export const CANCEL_REASONS = [
  "Ordered by mistake",
  "Found a better price",
  "Delivery is taking too long",
  "Want to change address or items",
  "Other",
] as const;

export function CancelDialog({
  open,
  onClose,
  onConfirm,
  busy,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  busy: boolean;
  error: string | null;
}) {
  const [reason, setReason] = React.useState<string>("");
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Cancel this order?"
      description="Any payment will be refunded to your GLAM wallet right away and stock will be released."
      actions={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Keep order
          </Button>
          <Button variant="danger" onClick={() => onConfirm(reason)} loading={busy} disabled={!reason}>
            Cancel order
          </Button>
        </>
      }
    >
      <Select label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} error={error ?? undefined} required>
        <option value="">Choose a reason</option>
        {CANCEL_REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </Select>
    </Dialog>
  );
}
