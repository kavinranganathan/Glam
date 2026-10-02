"use client";

import * as React from "react";
import { QrCode, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { BANKS, BNPL_PROVIDERS, EMI_TENURES, UPI_APPS, WALLETS, emiMonthly } from "@/lib/payments/provider";
import type { PaymentMethod } from "@/lib/pricing/types";
import { cn } from "@/lib/utils/cn";
import { formatINR } from "@/lib/utils/money";

export const CARD_OTP = "123456";

/**
 * Method-specific mock gateway UI. `onReady(false)` blocks the Pay button until the shopper
 * finishes the mock step (e.g. card 3-D Secure OTP, bank login).
 */
export function GatewayMethodPanel({ method, amount, onReady }: { method: PaymentMethod; amount: number; onReady: (ready: boolean) => void }) {
  switch (method) {
    case "upi":
      return <UpiPanel amount={amount} onReady={onReady} />;
    case "card":
      return <CardPanel onReady={onReady} />;
    case "netbanking":
      return <NetBankingPanel onReady={onReady} />;
    case "emi":
      return <EmiPanel amount={amount} onReady={onReady} />;
    case "cod":
      return <ConfirmPanel title="Confirm Cash on Delivery" body={`Keep ${formatINR(amount)} ready when your order arrives. Our delivery partner accepts cash and UPI.`} onReady={onReady} />;
    case "bnpl":
      return <PickPanel title="Pay later with" options={BNPL_PROVIDERS} onReady={onReady} note="Your provider will confirm the plan after this step." />;
    case "wallet":
      return <PickPanel title="Choose your wallet" options={WALLETS} onReady={onReady} />;
    default:
      return <ConfirmPanel title="Confirm payment" body={`You are about to pay ${formatINR(amount)}.`} onReady={onReady} />;
  }
}

function useReadyOnMount(onReady: (r: boolean) => void, ready: boolean) {
  React.useEffect(() => {
    onReady(ready);
  }, [onReady, ready]);
}

function UpiPanel({ amount, onReady }: { amount: number; onReady: (r: boolean) => void }) {
  const [vpa, setVpa] = React.useState("");
  const [opened, setOpened] = React.useState<string | null>(null);
  useReadyOnMount(onReady, true);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-border bg-surface p-6 text-center">
        <QrCode className="h-28 w-28 text-text" aria-hidden />
        <p className="text-sm font-semibold">Scan to pay {formatINR(amount)}</p>
        <p className="text-xs text-text-tertiary">Simulated QR · any UPI app</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {UPI_APPS.slice(0, 4).map((app) => (
          <Button key={app} variant={opened === app ? "secondary" : "outline"} size="sm" onClick={() => setOpened(app)}>
            <Smartphone className="h-4 w-4" aria-hidden /> Open {app}
          </Button>
        ))}
      </div>
      {opened && <p className="text-xs text-text-secondary">Pretend {opened} opened and you approved the request, then tap &ldquo;I&rsquo;ve paid&rdquo; below.</p>}
      <Input label="Or pay with UPI ID" value={vpa} onChange={(e) => setVpa(e.target.value)} placeholder="name@bank" autoComplete="off" />
    </div>
  );
}

function CardPanel({ onReady }: { onReady: (r: boolean) => void }) {
  const [otp, setOtp] = React.useState("");
  const ok = otp === CARD_OTP;
  useReadyOnMount(onReady, ok);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-card bg-surface p-3 text-sm">
        <ShieldCheck className="h-5 w-5 text-success" aria-hidden />
        <div>
          <p className="font-semibold">3-D Secure verification</p>
          <p className="text-xs text-text-tertiary">Your bank sent a one-time password to your registered mobile.</p>
        </div>
      </div>
      <Input
        label="Enter OTP"
        value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        hint={`Simulated: enter ${CARD_OTP}`}
        error={otp.length === 6 && !ok ? "Incorrect OTP. Try 123456." : undefined}
      />
    </div>
  );
}

function NetBankingPanel({ onReady }: { onReady: (r: boolean) => void }) {
  const [bank, setBank] = React.useState(BANKS[0]);
  const [user, setUser] = React.useState("");
  const [pass, setPass] = React.useState("");
  const ok = user.trim().length > 0 && pass.length > 0;
  useReadyOnMount(onReady, ok);
  return (
    <div className="flex flex-col gap-3">
      <Select label="Bank" value={bank} onChange={(e) => setBank(e.target.value)}>
        {BANKS.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </Select>
      <div className="rounded-card border border-border p-3">
        <p className="mb-2 text-sm font-semibold">{bank} · Net banking login (mock)</p>
        <div className="flex flex-col gap-3">
          <Input label="Customer ID" value={user} onChange={(e) => setUser(e.target.value)} autoComplete="off" />
          <Input label="Password" type="password" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="off" hint="Anything works here — nothing is sent." />
        </div>
      </div>
    </div>
  );
}

function EmiPanel({ amount, onReady }: { amount: number; onReady: (r: boolean) => void }) {
  const [tenure, setTenure] = React.useState<number>(EMI_TENURES[0]);
  useReadyOnMount(onReady, true);
  return (
    <div role="radiogroup" aria-label="EMI tenure" className="flex flex-col gap-2">
      {EMI_TENURES.map((m) => (
        <button key={m} type="button" role="radio" aria-checked={tenure === m} onClick={() => setTenure(m)} className={cn("flex items-center justify-between rounded-card border px-4 py-3 text-sm", tenure === m ? "border-primary bg-primary-soft text-primary" : "border-border")}>
          <span className="font-semibold">{m} months</span>
          <span>{formatINR(emiMonthly(amount, m))}/mo</span>
        </button>
      ))}
    </div>
  );
}

function PickPanel({ title, options, onReady, note }: { title: string; options: readonly string[]; onReady: (r: boolean) => void; note?: string }) {
  const [picked, setPicked] = React.useState(options[0]);
  useReadyOnMount(onReady, true);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold">{title}</p>
      <div role="radiogroup" aria-label={title} className="grid grid-cols-2 gap-2">
        {options.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={picked === o} onClick={() => setPicked(o)} className={cn("h-11 rounded-card border px-3 text-sm font-medium", picked === o ? "border-primary bg-primary-soft text-primary" : "border-border")}>
            {o}
          </button>
        ))}
      </div>
      {note && <p className="text-xs text-text-tertiary">{note}</p>}
    </div>
  );
}

function ConfirmPanel({ title, body, onReady }: { title: string; body: string; onReady: (r: boolean) => void }) {
  useReadyOnMount(onReady, true);
  return (
    <div className="rounded-card bg-surface p-4">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-text-secondary">{body}</p>
    </div>
  );
}
