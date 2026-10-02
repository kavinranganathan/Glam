"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/input";
import { Chip } from "@/components/ui/chip";
import { useToast } from "@/components/ui/toast";
import { ADDRESS_LABELS, addressInputSchema, type Address, type AddressInput } from "@/lib/orders/address";

type Field = keyof AddressInput;
type Draft = Record<Exclude<Field, "isDefault">, string> & { isDefault: boolean };

const EMPTY: Draft = { label: "Home", name: "", phone: "", line1: "", line2: "", landmark: "", city: "", state: "", pincode: "", isDefault: false };

function fromInitial(initial?: Partial<Address>): Draft {
  if (!initial) return EMPTY;
  return {
    label: initial.label ?? "Home",
    name: initial.name ?? "",
    phone: initial.phone ?? "",
    line1: initial.line1 ?? "",
    line2: initial.line2 ?? "",
    landmark: initial.landmark ?? "",
    city: initial.city ?? "",
    state: initial.state ?? "",
    pincode: initial.pincode ?? "",
    isDefault: initial.isDefault ?? false,
  };
}

/** Add / edit address form. Creates (POST) when `initial.id` is absent, otherwise updates (PATCH). */
export function AddressForm({
  initial,
  onSaved,
  onCancel,
  onSubmitLocal,
  submitLabel,
}: {
  initial?: Partial<Address>;
  onSaved: (a: Address) => void;
  onCancel?: () => void;
  /** Guest mode: validate and hand back the input without saving to the address book. */
  onSubmitLocal?: (input: AddressInput) => void;
  submitLabel?: string;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = React.useState<Draft>(() => fromInitial(initial));
  const [errors, setErrors] = React.useState<Partial<Record<Field, string>>>({});
  const [custom, setCustom] = React.useState(() => Boolean(initial?.label && !ADDRESS_LABELS.includes(initial.label as (typeof ADDRESS_LABELS)[number])));
  const [checking, setChecking] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const set = (field: Field, value: string | boolean) => {
    setDraft((d) => ({ ...d, [field]: value }));
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  };

  const checkPincode = async (pincode: string) => {
    if (!/^\d{6}$/.test(pincode)) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/pincode/${pincode}`);
      if (res.status === 404) {
        setErrors((e) => ({ ...e, pincode: "Sorry, we don't deliver to this pincode yet." }));
        return;
      }
      if (!res.ok) return;
      const q = (await res.json()) as { city: string; state: string };
      setDraft((d) => ({ ...d, city: d.city || q.city, state: d.state || q.state }));
    } finally {
      setChecking(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = addressInputSchema.safeParse(draft);
    if (!parsed.success) {
      const next: Partial<Record<Field, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as Field | undefined;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    if (errors.pincode) return;
    if (onSubmitLocal) {
      onSubmitLocal(parsed.data);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(initial?.id ? `/api/addresses/${initial.id}` : "/api/addresses", {
        method: initial?.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        toast({ title: data?.error?.message ?? "Couldn't save the address", tone: "error" });
        return;
      }
      onSaved((await res.json()) as Address);
    } catch {
      toast({ title: "Network error. Please try again.", tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-text-secondary">Save as</legend>
        <div className="flex flex-wrap gap-2">
          {ADDRESS_LABELS.map((l) => (
            <Chip
              key={l}
              selected={l === "Other" ? custom : !custom && draft.label === l}
              onClick={() => {
                if (l === "Other") {
                  setCustom(true);
                  set("label", "");
                } else {
                  setCustom(false);
                  set("label", l);
                }
              }}
            >
              {l}
            </Chip>
          ))}
        </div>
        {custom && <Input label="Label" value={draft.label} onChange={(e) => set("label", e.target.value)} maxLength={30} placeholder="e.g. Mom's place" error={errors.label} className="mt-2" />}
        {!custom && errors.label && (
          <p className="mt-1 text-sm text-error" role="alert">
            {errors.label}
          </p>
        )}
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" value={draft.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" error={errors.name} />
        <Input label="Mobile number" value={draft.phone} onChange={(e) => set("phone", e.target.value.replace(/[^\d+ -]/g, ""))} inputMode="tel" autoComplete="tel-national" maxLength={14} leading={<span className="text-sm">+91</span>} error={errors.phone} />
      </div>
      <Input label="Flat / House no., Building, Street" value={draft.line1} onChange={(e) => set("line1", e.target.value)} autoComplete="address-line1" error={errors.line1} />
      <Input label="Area, Colony (optional)" value={draft.line2} onChange={(e) => set("line2", e.target.value)} autoComplete="address-line2" error={errors.line2} />
      <Input label="Landmark (optional)" value={draft.landmark} onChange={(e) => set("landmark", e.target.value)} error={errors.landmark} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label="Pincode"
          value={draft.pincode}
          onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
          onBlur={(e) => void checkPincode(e.target.value)}
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          error={errors.pincode}
          hint={checking ? "Checking serviceability…" : undefined}
        />
        <Input label="City" value={draft.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" error={errors.city} />
        <Input label="State" value={draft.state} onChange={(e) => set("state", e.target.value)} autoComplete="address-level1" error={errors.state} />
      </div>
      <Checkbox label="Make this my default address" checked={draft.isDefault} onChange={(e) => set("isDefault", e.target.checked)} />
      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" loading={saving} className="flex-1">
          {submitLabel ?? (initial?.id ? "Save changes" : "Save address")}
        </Button>
      </div>
    </form>
  );
}
