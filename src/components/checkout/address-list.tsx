"use client";

import * as React from "react";
import { Check, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { formatAddressLines, type Address } from "@/lib/orders/address";
import { cn } from "@/lib/utils/cn";
import { AddressForm } from "./address-form";

export interface AddressListProps {
  addresses: Address[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Called after any add / edit / delete / default change so the parent can refetch. */
  onChanged: () => void;
  /** `select`: radio cards for checkout. `manage`: profile page with edit / delete / default actions. */
  mode?: "select" | "manage";
}

export function AddressList({ addresses, selectedId, onSelect, onChanged, mode = "select" }: AddressListProps) {
  const { toast } = useToast();
  const [editing, setEditing] = React.useState<Address | "new" | null>(null);
  const [deleting, setDeleting] = React.useState<Address | null>(null);
  const [busy, setBusy] = React.useState(false);
  const selectable = mode === "select";

  const call = async (input: string, init: RequestInit, success: string) => {
    setBusy(true);
    try {
      const res = await fetch(input, { ...init, headers: { "Content-Type": "application/json" } });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        toast({ title: data?.error?.message ?? "Something went wrong", tone: "error" });
        return false;
      }
      toast({ title: success, tone: "success" });
      onChanged();
      return true;
    } catch {
      toast({ title: "Network error. Please try again.", tone: "error" });
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {addresses.length === 0 && (
        <p className="rounded-card border border-dashed border-border p-4 text-sm text-text-secondary">No saved addresses yet. Add one to continue.</p>
      )}
      <ul className={cn("flex flex-col gap-3", selectable && "role-radiogroup")} role={selectable ? "radiogroup" : undefined} aria-label={selectable ? "Delivery address" : undefined}>
        {addresses.map((a) => {
          const selected = selectable && a.id === selectedId;
          const Wrapper = selectable ? "button" : "div";
          return (
            <li key={a.id}>
              <div className={cn("relative rounded-card border bg-background transition-colors", selected ? "border-primary ring-2 ring-primary/20" : "border-border")}>
                <Wrapper
                  {...(selectable ? { type: "button", role: "radio", "aria-checked": selected, onClick: () => onSelect?.(a.id) } : {})}
                  className={cn("flex w-full items-start gap-3 p-4 text-left", selectable && "min-h-[44px]")}
                >
                  <span className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", selected ? "border-primary bg-primary text-white" : "border-border text-transparent", !selectable && "hidden")} aria-hidden>
                    <Check className="h-3 w-3" />
                  </span>
                  {!selectable && <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />}
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-text">{a.name}</span>
                      <Badge tone="neutral">{a.label}</Badge>
                      {a.isDefault && <Badge tone="primary">Default</Badge>}
                    </span>
                    {formatAddressLines(a).map((line) => (
                      <span key={line} className="block text-sm text-text-secondary">
                        {line}
                      </span>
                    ))}
                    <span className="block text-sm text-text-secondary">Phone: {a.phone}</span>
                  </span>
                </Wrapper>
                <div className="flex flex-wrap gap-1 border-t border-border px-2 py-1">
                  <button type="button" onClick={() => setEditing(a)} className="inline-flex h-11 items-center gap-1 rounded-pill px-3 text-sm font-medium text-text-secondary hover:bg-surface">
                    <Pencil className="h-4 w-4" aria-hidden /> Edit
                  </button>
                  <button type="button" onClick={() => setDeleting(a)} className="inline-flex h-11 items-center gap-1 rounded-pill px-3 text-sm font-medium text-text-secondary hover:bg-surface">
                    <Trash2 className="h-4 w-4" aria-hidden /> Delete
                  </button>
                  {!a.isDefault && (
                    <button type="button" disabled={busy} onClick={() => void call(`/api/addresses/${a.id}`, { method: "PATCH", body: JSON.stringify({ isDefault: true }) }, "Default address updated")} className="inline-flex h-11 items-center rounded-pill px-3 text-sm font-medium text-primary hover:bg-primary-soft">
                      Set as default
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <Button variant="outline" onClick={() => setEditing("new")} className="self-start">
        <Plus className="h-4 w-4" aria-hidden /> Add new address
      </Button>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Add address" : "Edit address"} desktop="side" size="lg">
        {editing !== null && (
          <AddressForm
            initial={editing === "new" ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSaved={(saved) => {
              setEditing(null);
              toast({ title: editing === "new" ? "Address added" : "Address updated", tone: "success" });
              onChanged();
              if (selectable) onSelect?.(saved.id);
            }}
          />
        )}
      </Sheet>
      <Dialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete this address?"
        description={deleting ? `${deleting.name}, ${deleting.line1}, ${deleting.city} ${deleting.pincode}` : undefined}
        actions={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                if (!deleting) return;
                const ok = await call(`/api/addresses/${deleting.id}`, { method: "DELETE" }, "Address deleted");
                if (ok) setDeleting(null);
              }}
            >
              Delete
            </Button>
          </>
        }
      />
    </div>
  );
}
