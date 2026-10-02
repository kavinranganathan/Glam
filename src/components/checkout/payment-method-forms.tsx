"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { Input, Select } from "@/components/ui/input";
import { BANKS, BNPL_PROVIDERS, EMI_TENURES, UPI_APPS, WALLETS, emiMonthly } from "@/lib/payments/provider";
import { COD_FEE } from "@/lib/pricing/delivery";
import { cn } from "@/lib/utils/cn";
import { formatINR } from "@/lib/utils/money";

/** Mock capture forms. Nothing typed here is sent anywhere; the simulated gateway handles the outcome. */

function OptionGrid({ options, value, onChange, label }: { options: readonly string[]; value: string | null; onChange: (v: string) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => onChange(o)} className={cn("h-11 rounded-card border px-3 text-sm font-medium transition-colors", value === o ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-surface")}>
          {o}
        </button>
      ))}
    </div>
  );
}

export function UpiForm() {
  const [app, setApp] = React.useState<string | null>(UPI_APPS[0]);
  const [vpa, setVpa] = React.useState("");
  return (
    <div className="flex flex-col gap-3">
      <OptionGrid options={UPI_APPS} value={app} onChange={setApp} label="UPI app" />
      <Input label="UPI ID (optional)" value={vpa} onChange={(e) => setVpa(e.target.value)} placeholder="name@bank" autoComplete="off" hint="You can also approve the request in your UPI app on the next step." />
    </div>
  );
}

export function CardForm() {
  const [card, setCard] = React.useState({ number: "", expiry: "", cvv: "", name: "" });
  const set = (k: keyof typeof card, v: string) => setCard((c) => ({ ...c, [k]: v }));
  return (
    <div className="flex flex-col gap-3">
      <Input label="Card number" value={card.number} onChange={(e) => set("number", e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 "))} inputMode="numeric" autoComplete="cc-number" placeholder="1234 5678 9012 3456" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Expiry (MM/YY)" value={card.expiry} onChange={(e) => set("expiry", e.target.value.replace(/\D/g, "").slice(0, 4).replace(/(\d{2})(?=\d)/, "$1/"))} inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" />
        <Input label="CVV" type="password" value={card.cvv} onChange={(e) => set("cvv", e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" autoComplete="cc-csc" placeholder="•••" />
      </div>
      <Input label="Name on card" value={card.name} onChange={(e) => set("name", e.target.value)} autoComplete="cc-name" />
      <p className="flex items-center gap-1.5 text-xs text-text-tertiary">
        <ShieldCheck className="h-4 w-4 text-success" aria-hidden /> Card details are tokenised by the payment gateway and never stored on GLAM.
      </p>
    </div>
  );
}

export function NetBankingForm() {
  const [bank, setBank] = React.useState<string | null>(BANKS[0]);
  return (
    <div className="flex flex-col gap-3">
      <OptionGrid options={BANKS.slice(0, 6)} value={bank} onChange={setBank} label="Popular banks" />
      <Select label="Other banks" value={bank ?? ""} onChange={(e) => setBank(e.target.value)}>
        {BANKS.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </Select>
    </div>
  );
}

export function WalletForm() {
  const [wallet, setWallet] = React.useState<string | null>(WALLETS[0]);
  return <OptionGrid options={WALLETS} value={wallet} onChange={setWallet} label="Wallet" />;
}

export function EmiForm({ total }: { total: number }) {
  const [tenure, setTenure] = React.useState<number>(EMI_TENURES[0]);
  return (
    <div role="radiogroup" aria-label="EMI tenure" className="flex flex-col gap-2">
      {EMI_TENURES.map((m) => {
        const monthly = emiMonthly(total, m);
        const selected = tenure === m;
        return (
          <button key={m} type="button" role="radio" aria-checked={selected} onClick={() => setTenure(m)} className={cn("flex items-center justify-between rounded-card border px-4 py-3 text-left text-sm", selected ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-surface")}>
            <span className="font-semibold">{m} months</span>
            <span>
              {formatINR(monthly)}/mo <span className="text-xs text-text-tertiary">· 15% p.a.</span>
            </span>
          </button>
        );
      })}
      <p className="text-xs text-text-tertiary">Total payable {formatINR(emiMonthly(total, tenure) * tenure)} over {tenure} months. Final terms are shown by your bank.</p>
    </div>
  );
}

export function BnplForm() {
  const [provider, setProvider] = React.useState<string | null>(BNPL_PROVIDERS[0]);
  return (
    <div className="flex flex-col gap-2">
      <OptionGrid options={BNPL_PROVIDERS} value={provider} onChange={setProvider} label="Pay later provider" />
      <p className="text-xs text-text-tertiary">Pay within 15 days at no extra cost. Subject to provider approval.</p>
    </div>
  );
}

export function CodNote() {
  return <p className="text-sm text-text-secondary">Pay in cash or by UPI when your order arrives. A {formatINR(COD_FEE)} handling fee applies to Cash on Delivery orders.</p>;
}
