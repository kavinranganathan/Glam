"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CouponRow } from "@/lib/admin/coupons";
import { formatDateTime } from "@/lib/utils/dates";
import { formatINR } from "@/lib/utils/money";
import { CouponForm, type ScopeOptions } from "./coupon-form";
import { DataTable, type Column } from "./data-table";
import { useAdminApi } from "./use-admin-api";

function describeValue(c: CouponRow): string {
  if (c.kind === "free_delivery") return "Free delivery";
  if (c.kind === "percent") return `${c.value}% off${c.max_discount ? ` (max ${formatINR(c.max_discount)})` : ""}`;
  return `${formatINR(c.value)} off`;
}

export function CouponsManager({ coupons, scopes }: { coupons: CouponRow[]; scopes: ScopeOptions }) {
  const { call, busy } = useAdminApi();
  const [edit, setEdit] = React.useState<{ open: boolean; row: CouponRow | null }>({ open: false, row: null });
  const scopeName = (c: CouponRow) => {
    if (c.scope === "all") return "All";
    const list = c.scope === "brand" ? scopes.brands : scopes.categories;
    return `${c.scope}: ${list.find((o) => o.id === c.scope_id)?.name ?? "?"}`;
  };

  const columns: Column<CouponRow>[] = [
    {
      key: "code",
      header: "Code",
      render: (c) => (
        <div>
          <p className="font-mono font-semibold">{c.code}</p>
          {c.description && <p className="text-xs text-text-tertiary">{c.description}</p>}
        </div>
      ),
    },
    { key: "value", header: "Value", render: (c) => describeValue(c) },
    { key: "min", header: "Min order", align: "right", render: (c) => (c.min_order ? formatINR(c.min_order) : "—") },
    { key: "scope", header: "Scope", render: (c) => <span className="text-xs">{scopeName(c)}</span> },
    {
      key: "usage",
      header: "Used",
      align: "right",
      render: (c) => (
        <span className="tabular-nums">
          {c.used_count}
          {c.usage_limit != null ? ` / ${c.usage_limit}` : ""}
        </span>
      ),
    },
    {
      key: "window",
      header: "Window",
      render: (c) => (
        <span className="text-xs text-text-secondary">
          {formatDateTime(c.starts_at)} – {c.ends_at ? formatDateTime(c.ends_at) : "∞"}
        </span>
      ),
    },
    {
      key: "flags",
      header: "Flags",
      render: (c) => (
        <div className="flex flex-wrap gap-1">
          {c.pro_only && <Badge tone="secondary">Pro</Badge>}
          <button type="button" disabled={busy} aria-pressed={c.is_active} className="min-h-0" onClick={() => call("PATCH", `/api/admin/coupons/${c.id}`, { is_active: !c.is_active }, { success: c.is_active ? "Coupon paused" : "Coupon active" })}>
            <Badge tone={c.is_active ? "success" : "neutral"}>{c.is_active ? "Active" : "Paused"}</Badge>
          </button>
        </div>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      render: (c) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEdit({ open: true, row: c })}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" className="text-error" disabled={busy} onClick={() => window.confirm(`Delete ${c.code}?`) && call("DELETE", `/api/admin/coupons/${c.id}`, undefined, { success: "Deleted" })}>
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
          New coupon
        </Button>
      </div>
      <DataTable columns={columns} rows={coupons} rowKey={(c) => c.id} caption="Coupons" empty="No platform coupons yet." />
      {edit.open && <CouponForm key={edit.row?.id ?? "new"} open initial={edit.row} scopes={scopes} onClose={() => setEdit((s) => ({ ...s, open: false }))} />}
    </div>
  );
}
