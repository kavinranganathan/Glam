"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import type { CouponRow, ScopeOption } from "@/lib/admin/coupons";
import { normaliseCouponCode, paiseToRupees, rupeesToPaise } from "@/lib/admin/rules";
import { isoToLocalInput, localInputToIso, numberOrNull } from "./form-utils";
import { useAdminApi } from "./use-admin-api";

export interface ScopeOptions {
  brands: ScopeOption[];
  categories: ScopeOption[];
}

interface Props {
  open: boolean;
  initial: CouponRow | null;
  scopes: ScopeOptions;
  onClose: () => void;
}

/** Create / edit a platform coupon. Money fields are rupees in the UI, paise on the wire. */
export function CouponForm({ open, initial, scopes, onClose }: Props) {
  const { call, busy } = useAdminApi();
  const [f, setF] = React.useState(() => toForm(initial));
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const scopeList = f.scope === "brand" ? scopes.brands : f.scope === "category" ? scopes.categories : [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      code: normaliseCouponCode(f.code),
      kind: f.kind,
      value: f.kind === "percent" ? Math.round(Number(f.value) || 0) : f.kind === "flat" ? rupeesToPaise(f.value) : 0,
      max_discount: f.kind === "percent" && f.max_discount !== "" ? rupeesToPaise(f.max_discount) : null,
      min_order: rupeesToPaise(f.min_order),
      scope: f.scope,
      scope_id: f.scope === "all" ? null : f.scope_id || null,
      starts_at: localInputToIso(f.starts_at) ?? undefined,
      ends_at: localInputToIso(f.ends_at),
      usage_limit: numberOrNull(f.usage_limit),
      per_user_limit: Math.max(1, Number(f.per_user_limit) || 1),
      pro_only: f.pro_only,
      is_active: f.is_active,
      description: f.description,
    };
    const res = initial
      ? await call("PATCH", `/api/admin/coupons/${initial.id}`, body, { success: "Coupon updated" })
      : await call("POST", "/api/admin/coupons", body, { success: "Coupon created" });
    if (res) onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={initial ? `Edit ${initial.code}` : "New coupon"} size="md">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input label="Code" required minLength={3} maxLength={32} value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase())} className="[&_input]:uppercase" placeholder="GLAM200" />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Kind" value={f.kind} onChange={(e) => set("kind", e.target.value as typeof f.kind)}>
            <option value="percent">Percent off</option>
            <option value="flat">Flat ₹ off</option>
            <option value="free_delivery">Free delivery</option>
          </Select>
          {f.kind !== "free_delivery" && (
            <Input label={f.kind === "percent" ? "Value (%)" : "Value (₹)"} type="number" min={0} max={f.kind === "percent" ? 100 : undefined} step={f.kind === "percent" ? 1 : "0.01"} required value={f.value} onChange={(e) => set("value", e.target.value)} />
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {f.kind === "percent" && <Input label="Max discount (₹)" type="number" min={0} step="0.01" value={f.max_discount} onChange={(e) => set("max_discount", e.target.value)} />}
          <Input label="Min order (₹)" type="number" min={0} step="0.01" value={f.min_order} onChange={(e) => set("min_order", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Scope" value={f.scope} onChange={(e) => setF((s) => ({ ...s, scope: e.target.value as typeof f.scope, scope_id: "" }))}>
            <option value="all">Whole catalogue</option>
            <option value="brand">One brand</option>
            <option value="category">One category</option>
          </Select>
          {f.scope !== "all" && (
            <Select label={f.scope === "brand" ? "Brand" : "Category"} required value={f.scope_id} onChange={(e) => set("scope_id", e.target.value)}>
              <option value="">Choose…</option>
              {scopeList.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Starts at" type="datetime-local" value={f.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
          <Input label="Ends at" type="datetime-local" value={f.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Usage limit (blank = unlimited)" type="number" min={1} value={f.usage_limit} onChange={(e) => set("usage_limit", e.target.value)} />
          <Input label="Per-user limit" type="number" min={1} value={f.per_user_limit} onChange={(e) => set("per_user_limit", e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-6">
          <Checkbox label="GLAM Pro members only" checked={f.pro_only} onChange={(e) => set("pro_only", e.target.checked)} />
          <Checkbox label="Active" checked={f.is_active} onChange={(e) => set("is_active", e.target.checked)} />
        </div>
        <Textarea label="Description (shown on the offers page)" maxLength={200} value={f.description} onChange={(e) => set("description", e.target.value)} className="[&_textarea]:min-h-20" />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {initial ? "Save changes" : "Create coupon"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

function toForm(c: CouponRow | null) {
  const kind = c?.kind ?? "percent";
  return {
    code: c?.code ?? "",
    kind,
    value: c ? String(kind === "flat" ? paiseToRupees(c.value) : c.value) : "",
    max_discount: c?.max_discount != null ? String(paiseToRupees(c.max_discount)) : "",
    min_order: String(paiseToRupees(c?.min_order ?? 0)),
    scope: c?.scope ?? "all",
    scope_id: c?.scope_id ?? "",
    starts_at: isoToLocalInput(c?.starts_at),
    ends_at: isoToLocalInput(c?.ends_at),
    usage_limit: c?.usage_limit != null ? String(c.usage_limit) : "",
    per_user_limit: String(c?.per_user_limit ?? 1),
    pro_only: c?.pro_only ?? false,
    is_active: c?.is_active ?? true,
    description: c?.description ?? "",
  };
}
