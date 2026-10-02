"use client";

import { Banknote, Check, CreditCard, Landmark, Smartphone, Wallet, CalendarClock, Hourglass } from "lucide-react";
import { PAYMENT_METHOD_LABEL, PAYMENT_METHODS_ORDERED } from "@/lib/payments/provider";
import { COD_FEE } from "@/lib/pricing/delivery";
import type { PaymentMethod } from "@/lib/pricing/types";
import { cn } from "@/lib/utils/cn";
import { formatINR } from "@/lib/utils/money";
import { BnplForm, CardForm, CodNote, EmiForm, NetBankingForm, UpiForm, WalletForm } from "./payment-method-forms";

const ICON: Record<PaymentMethod, React.ReactNode> = {
  upi: <Smartphone className="h-5 w-5" aria-hidden />,
  card: <CreditCard className="h-5 w-5" aria-hidden />,
  netbanking: <Landmark className="h-5 w-5" aria-hidden />,
  wallet: <Wallet className="h-5 w-5" aria-hidden />,
  emi: <CalendarClock className="h-5 w-5" aria-hidden />,
  bnpl: <Hourglass className="h-5 w-5" aria-hidden />,
  cod: <Banknote className="h-5 w-5" aria-hidden />,
  giftcard: <Wallet className="h-5 w-5" aria-hidden />,
};

const HINT: Partial<Record<PaymentMethod, string>> = {
  upi: "Google Pay, PhonePe, Paytm & more",
  card: "Visa, Mastercard, RuPay, Amex",
  netbanking: "All major Indian banks",
  wallet: "Paytm, Amazon Pay, Mobikwik",
  emi: "No-cost options on select cards",
  bnpl: "Simpl, LazyPay, ZestMoney",
  cod: `${formatINR(COD_FEE)} handling fee`,
};

/** Accordion radio list of payment methods; the selected one expands to its mock capture form. */
export function PaymentMethods({
  value,
  onChange,
  total,
  issues,
  disabled,
}: {
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
  /** Order total used for EMI maths (paise). */
  total: number;
  /** Reason a method is unavailable, keyed by method. */
  issues: Partial<Record<PaymentMethod, string>>;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Payment method" className="overflow-hidden rounded-card border border-border">
      {PAYMENT_METHODS_ORDERED.map((m, i) => {
        const selected = m === value;
        const issue = issues[m] ?? null;
        const unavailable = Boolean(issue);
        return (
          <div key={m} className={cn(i > 0 && "border-t border-border")}>
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={unavailable || disabled}
              aria-controls={selected ? `pm-${m}` : undefined}
              onClick={() => !unavailable && !disabled && onChange(m)}
              className={cn("flex w-full items-center gap-3 px-4 py-3 text-left", selected ? "bg-primary-soft/40" : "hover:bg-surface", unavailable && "cursor-not-allowed opacity-60")}
            >
              <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", selected ? "border-primary bg-primary text-white" : "border-border text-transparent")} aria-hidden>
                <Check className="h-3 w-3" />
              </span>
              <span className="text-text-secondary">{ICON[m]}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-text">{PAYMENT_METHOD_LABEL[m]}</span>
                <span className={cn("block text-xs", unavailable ? "text-error" : "text-text-tertiary")}>{issue ?? HINT[m]}</span>
              </span>
            </button>
            {selected && (
              <div id={`pm-${m}`} className="border-t border-border bg-background px-4 py-4 animate-fade-up">
                {m === "upi" && <UpiForm />}
                {m === "card" && <CardForm />}
                {m === "netbanking" && <NetBankingForm />}
                {m === "wallet" && <WalletForm />}
                {m === "emi" && <EmiForm total={total} />}
                {m === "bnpl" && <BnplForm />}
                {m === "cod" && <CodNote />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
