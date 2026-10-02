"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FlashSaleView } from "@/lib/admin/merch";
import type { FlashPhase } from "@/lib/admin/rules";
import { formatDateTime } from "@/lib/utils/dates";
import { DataTable, type Column } from "./data-table";
import { FlashSaleForm } from "./flash-sale-form";
import { useAdminApi } from "./use-admin-api";

const PHASE: Record<FlashPhase, { label: string; tone: "success" | "info" | "neutral" | "warning" }> = {
  live: { label: "Live", tone: "success" },
  scheduled: { label: "Scheduled", tone: "info" },
  ended: { label: "Ended", tone: "warning" },
  inactive: { label: "Inactive", tone: "neutral" },
};

export type FlashSaleWithPhase = FlashSaleView & { phase: FlashPhase };

export function FlashSalesManager({ sales }: { sales: FlashSaleWithPhase[] }) {
  const { call, busy } = useAdminApi();
  const [edit, setEdit] = React.useState<{ open: boolean; row: FlashSaleView | null }>({ open: false, row: null });

  const columns: Column<FlashSaleWithPhase>[] = [
    {
      key: "name",
      header: "Sale",
      render: (s) => (
        <div>
          <p className="font-semibold">{s.name}</p>
          <p className="text-xs text-text-tertiary">
            {formatDateTime(s.startsAt)} → {formatDateTime(s.endsAt)}
          </p>
        </div>
      ),
    },
    {
      key: "items",
      header: "Items",
      render: (s) => (
        <span title={s.items.map((i) => i.name).join(", ")}>
          {s.items.length} product{s.items.length === 1 ? "" : "s"}
        </span>
      ),
    },
    {
      key: "state",
      header: "State",
      render: (s) => <Badge tone={PHASE[s.phase].tone}>{PHASE[s.phase].label}</Badge>,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      render: (s) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => call("PATCH", `/api/admin/flash-sales/${s.id}`, { is_active: !s.isActive }, { success: s.isActive ? "Deactivated" : "Activated" })}>
            {s.isActive ? "Deactivate" : "Activate"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEdit({ open: true, row: s })}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-error"
            disabled={busy}
            onClick={() => window.confirm(`Delete "${s.name}"?`) && call("DELETE", `/api/admin/flash-sales/${s.id}`, undefined, { success: "Deleted" })}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setEdit({ open: true, row: null })}>
          New flash sale
        </Button>
      </div>
      <DataTable columns={columns} rows={sales} rowKey={(s) => s.id} caption="Flash sales" empty="No flash sales yet." />
      {edit.open && <FlashSaleForm key={edit.row?.id ?? "new"} open initial={edit.row} onClose={() => setEdit((s) => ({ ...s, open: false }))} />}
    </div>
  );
}
