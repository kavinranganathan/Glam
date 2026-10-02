"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select } from "@/components/ui/input";

export interface Address {
  id: string;
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

type Draft = Omit<Address, "id">;
const EMPTY: Draft = { label: "Home", name: "", phone: "", line1: "", line2: "", landmark: "", city: "", state: "", pincode: "", isDefault: false };

/** Fallback for `@/components/checkout/address-form` — same props and API contract (POST / PATCH /api/addresses). */
export function AddressForm({ initial, onSaved, onCancel }: { initial?: Address; onSaved: (address: Address) => void; onCancel?: () => void }) {
  const [d, setD] = React.useState<Draft>(initial ? { ...initial, line2: initial.line2 ?? "", landmark: initial.landmark ?? "" } : EMPTY);
  const [errors, setErrors] = React.useState<Partial<Record<keyof Draft, string>>>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [pinHint, setPinHint] = React.useState<string | null>(null);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const lookupSeq = React.useRef(0);

  /** Auto-fills city/state from the pincode service once 6 digits are typed. */
  const onPincode = (raw: string) => {
    const pincode = raw.replace(/\D/g, "").slice(0, 6);
    set("pincode", pincode);
    const seq = ++lookupSeq.current;
    if (!/^\d{6}$/.test(pincode)) {
      setPinHint(null);
      return;
    }
    fetch(`/api/pincode/${pincode}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { city?: string; state?: string; serviceable?: boolean } | null) => {
        if (seq !== lookupSeq.current) return;
        if (!j) {
          setPinHint("We do not deliver to this pincode yet.");
          return;
        }
        setD((p) => ({ ...p, city: p.city || j.city || "", state: p.state || j.state || "" }));
        setPinHint(j.serviceable === false ? "We do not deliver to this pincode yet." : j.city ? `${j.city}, ${j.state}` : null);
      })
      .catch(() => {});
  };

  const validate = () => {
    const e: typeof errors = {};
    if (d.name.trim().length < 2) e.name = "Enter the recipient's name";
    if (!/^[6-9]\d{9}$/.test(d.phone)) e.phone = "Enter a 10-digit mobile number";
    if (d.line1.trim().length < 3) e.line1 = "Enter house / flat and street";
    if (d.city.trim().length < 2) e.city = "Enter a city";
    if (d.state.trim().length < 2) e.state = "Enter a state";
    if (!/^\d{6}$/.test(d.pincode)) e.pincode = "Enter a 6-digit pincode";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setServerError(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const payload = { ...d, line2: d.line2 || null, landmark: d.landmark || null };
      const res = await fetch(initial ? `/api/addresses/${initial.id}` : "/api/addresses", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as (Address & { error?: undefined }) | { error: { message: string } };
      if (!res.ok || json.error) throw new Error(json.error?.message ?? "Could not save address");
      onSaved(json);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Could not save address");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Select label="Save as" value={d.label} onChange={(e) => set("label", e.target.value)}>
        {["Home", "Work", "Other"].map((l) => (
          <option key={l}>{l}</option>
        ))}
      </Select>
      <Input label="Recipient name" value={d.name} onChange={(e) => set("name", e.target.value)} error={errors.name} autoComplete="name" />
      <Input label="Mobile" value={d.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} error={errors.phone} inputMode="numeric" leading={<span className="text-sm">+91</span>} />
      <Input label="Pincode" value={d.pincode} onChange={(e) => onPincode(e.target.value)} error={errors.pincode} hint={pinHint ?? undefined} inputMode="numeric" autoComplete="postal-code" />
      <Input label="House / flat, street" value={d.line1} onChange={(e) => set("line1", e.target.value)} error={errors.line1} className="sm:col-span-2" autoComplete="address-line1" />
      <Input label="Area, locality (optional)" value={d.line2 ?? ""} onChange={(e) => set("line2", e.target.value)} autoComplete="address-line2" />
      <Input label="Landmark (optional)" value={d.landmark ?? ""} onChange={(e) => set("landmark", e.target.value)} />
      <Input label="City" value={d.city} onChange={(e) => set("city", e.target.value)} error={errors.city} autoComplete="address-level2" />
      <Input label="State" value={d.state} onChange={(e) => set("state", e.target.value)} error={errors.state} autoComplete="address-level1" />
      <Checkbox label="Make this my default address" checked={d.isDefault} onChange={(e) => set("isDefault", e.target.checked)} className="sm:col-span-2" />
      {serverError && (
        <p role="alert" className="text-sm text-error sm:col-span-2">
          {serverError}
        </p>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" loading={busy}>
          {initial ? "Save changes" : "Save address"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
