"use client";

import * as React from "react";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { AddressForm, type Address } from "./address-fallback-form";

export type { Address } from "./address-fallback-form";

/**
 * Fallback for `@/components/checkout/address-list` (same props and API contract:
 * GET/POST /api/addresses, PATCH/DELETE /api/addresses/[id]). Used until the checkout agent's version lands.
 */
export function AddressList({
  addresses,
  selectedId,
  onSelect,
  onChanged,
  mode = "manage",
}: {
  addresses: Address[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onChanged: () => void;
  mode?: "select" | "manage";
}) {
  const { toast } = useToast();
  const [editing, setEditing] = React.useState<Address | null | "new">(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const remove = async (a: Address) => {
    setBusyId(a.id);
    const res = await fetch(`/api/addresses/${a.id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) return toast({ title: "Could not delete address", tone: "error" });
    toast({ title: "Address removed", tone: "success" });
    onChanged();
  };

  const makeDefault = async (a: Address) => {
    setBusyId(a.id);
    const res = await fetch(`/api/addresses/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isDefault: true }) });
    setBusyId(null);
    if (!res.ok) return toast({ title: "Could not set default", tone: "error" });
    onChanged();
  };

  return (
    <div className="flex flex-col gap-3">
      {addresses.length === 0 ? (
        <EmptyState icon={<MapPin className="h-7 w-7" aria-hidden />} title="No saved addresses" description="Add one to speed through checkout." action={{ label: "Add address", onClick: () => setEditing("new") }} />
      ) : (
        <ul className="flex flex-col gap-3">
          {addresses.map((a) => {
            const selected = selectedId === a.id;
            const Wrapper = mode === "select" ? "button" : "div";
            return (
              <li key={a.id}>
                <Wrapper
                  type={mode === "select" ? "button" : undefined}
                  onClick={mode === "select" ? () => onSelect?.(a.id) : undefined}
                  aria-pressed={mode === "select" ? selected : undefined}
                  className={`block w-full rounded-card border p-4 text-left ${selected ? "border-primary bg-primary-soft" : "border-border bg-background"}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-text">{a.label}</span>
                    {a.isDefault && <Badge tone="primary">Default</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-text">{a.name} · +91 {a.phone}</p>
                  <p className="text-sm text-text-secondary">
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ""}
                    {a.landmark ? `, near ${a.landmark}` : ""}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {a.city}, {a.state} – {a.pincode}
                  </p>
                  {mode === "manage" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditing(a)}>
                        <Pencil className="h-4 w-4" aria-hidden /> Edit
                      </Button>
                      {!a.isDefault && (
                        <Button size="sm" variant="ghost" onClick={() => makeDefault(a)} loading={busyId === a.id}>
                          <Star className="h-4 w-4" aria-hidden /> Set default
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-error" onClick={() => remove(a)} loading={busyId === a.id}>
                        <Trash2 className="h-4 w-4" aria-hidden /> Delete
                      </Button>
                    </div>
                  )}
                </Wrapper>
              </li>
            );
          })}
        </ul>
      )}
      {addresses.length > 0 && (
        <Button variant="outline" onClick={() => setEditing("new")} className="self-start">
          <Plus className="h-4 w-4" aria-hidden /> Add new address
        </Button>
      )}
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Add address" : "Edit address"} desktop="modal" size="lg">
        {editing !== null && (
          <AddressForm
            initial={editing === "new" ? undefined : editing}
            onSaved={() => {
              setEditing(null);
              onChanged();
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Sheet>
    </div>
  );
}
