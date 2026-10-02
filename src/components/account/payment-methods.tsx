"use client";

import * as React from "react";
import { CreditCard, Smartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { isValidVpa } from "@/lib/loyalty/rules";
import { PAYMENT_METHOD_LABEL } from "@/lib/payments/provider";
import type { PaymentMethod } from "@/lib/pricing/types";

export interface SavedMethod {
  id: string;
  kind: PaymentMethod;
  label: string;
  created_at: string;
}

type Mode = "upi" | "card";

/** S43 saved payment methods: list, add UPI or card (label only), delete. */
export function PaymentMethods({ initial }: { initial: SavedMethod[] }) {
  const { toast } = useToast();
  const [methods, setMethods] = React.useState(initial);
  const [mode, setMode] = React.useState<Mode>("upi");
  const [vpa, setVpa] = React.useState("");
  const [card, setCard] = React.useState({ brand: "Visa", last4: "", expiry: "" });
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const add = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    const body =
      mode === "upi"
        ? { kind: "upi", vpa: vpa.trim() }
        : { kind: "card", brand: card.brand, last4: card.last4, expiry: card.expiry };
    if (mode === "upi" && !isValidVpa(vpa)) return setError("Enter a valid UPI ID like name@bank");
    if (mode === "card" && !/^\d{4}$/.test(card.last4)) return setError("Enter the last 4 digits of the card");
    if (mode === "card" && !/^(0[1-9]|1[0-2])\/\d{2}$/.test(card.expiry)) return setError("Expiry must be MM/YY");
    setBusy(true);
    try {
      const res = await fetch("/api/me/payment-methods", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = (await res.json()) as { method?: SavedMethod; error?: { message: string } };
      if (!res.ok || !json.method) throw new Error(json.error?.message ?? "Could not save");
      setMethods((m) => [json.method as SavedMethod, ...m]);
      setVpa("");
      setCard({ brand: "Visa", last4: "", expiry: "" });
      toast({ title: "Payment method saved", tone: "success" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    const prev = methods;
    setMethods((m) => m.filter((x) => x.id !== id));
    const res = await fetch(`/api/me/payment-methods/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setMethods(prev);
      toast({ title: "Could not remove", tone: "error" });
    } else {
      toast({ title: "Removed", tone: "success" });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="saved-methods">
        <h2 id="saved-methods" className="font-display text-lg font-semibold">
          Saved methods
        </h2>
        {methods.length === 0 ? (
          <EmptyState title="No saved payment methods" description="Save a UPI ID or card to check out faster." className="py-8" />
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-card border border-border">
            {methods.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <span className="rounded-full bg-primary-soft p-2 text-primary">
                  {m.kind === "upi" ? <Smartphone className="h-5 w-5" aria-hidden /> : <CreditCard className="h-5 w-5" aria-hidden />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-sm font-semibold text-text">{m.label}</span>
                  <span className="block text-xs text-text-tertiary">{PAYMENT_METHOD_LABEL[m.kind]}</span>
                </span>
                <Button variant="ghost" size="icon" aria-label={`Remove ${m.label}`} onClick={() => remove(m.id)}>
                  <Trash2 className="h-5 w-5 text-error" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="add-method" className="rounded-card border border-border p-4">
        <h2 id="add-method" className="font-display text-lg font-semibold">
          Add a payment method
        </h2>
        <Tabs<Mode> className="mt-2" value={mode} onChange={setMode} tabs={[{ value: "upi", label: "UPI ID" }, { value: "card", label: "Card" }]} />
        <form onSubmit={add} className="mt-4 flex flex-col gap-4" noValidate>
          {mode === "upi" ? (
            <Input label="UPI ID" placeholder="name@bank" value={vpa} onChange={(e) => setVpa(e.target.value)} autoComplete="off" inputMode="email" />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Select label="Card brand" value={card.brand} onChange={(e) => setCard((c) => ({ ...c, brand: e.target.value }))}>
                {["Visa", "Mastercard", "RuPay", "Amex"].map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </Select>
              <Input label="Last 4 digits" inputMode="numeric" maxLength={4} value={card.last4} onChange={(e) => setCard((c) => ({ ...c, last4: e.target.value.replace(/\D/g, "") }))} />
              <Input label="Expiry (MM/YY)" placeholder="08/29" maxLength={5} value={card.expiry} onChange={(e) => setCard((c) => ({ ...c, expiry: e.target.value }))} className="col-span-2" />
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}
          <Button type="submit" loading={busy}>
            Save {mode === "upi" ? "UPI ID" : "card"}
          </Button>
          <p className="text-xs text-text-tertiary">
            Tokenisation note: GLAM never stores full card numbers or CVV. In production the gateway SDK tokenises the card in your browser; here only the brand, last 4 digits and expiry are kept as a label.
          </p>
        </form>
      </section>
    </div>
  );
}
