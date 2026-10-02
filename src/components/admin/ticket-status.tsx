"use client";

import { Select } from "@/components/ui/input";
import type { TicketStatus } from "@/lib/admin/ops";
import { useAdminApi } from "./use-admin-api";

const OPTIONS: Array<{ value: TicketStatus; label: string }> = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
];

export function TicketStatusSelect({ ticketId, status }: { ticketId: string; status: TicketStatus }) {
  const { call, busy } = useAdminApi();
  return (
    <Select
      aria-label="Ticket status"
      value={status}
      disabled={busy}
      className="w-40"
      onChange={(e) => call("PATCH", `/api/admin/tickets/${ticketId}`, { status: e.target.value }, { success: "Ticket updated" })}
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
