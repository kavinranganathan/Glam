import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { ProPayForm } from "@/components/account/pro-pay-form";
import { getUser } from "@/lib/auth/session";
import { PRO_PRICE_PAISE } from "@/lib/account/pro";
import { formatShortDate } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Pay for GLAM Pro" };

/** Simulated payment page for GLAM Pro. */
export default async function ProPayPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/pro");
  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 px-4 py-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">{user.isPro ? "Extend GLAM Pro" : "Join GLAM Pro"}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {user.isPro && user.pro_until ? `Your membership currently ends ${formatShortDate(user.pro_until)}; this adds one month.` : "One month of Pro benefits, active immediately after payment."}
        </p>
      </div>
      <ProPayForm amount={PRO_PRICE_PAISE} />
      <p className="flex items-center gap-2 text-xs text-text-tertiary">
        <ShieldCheck className="h-4 w-4 text-success" aria-hidden /> Secured by a simulated gateway — no card details are collected.
      </p>
      <Link href="/pro" className="text-sm font-semibold text-primary">
        ← Back to GLAM Pro
      </Link>
    </div>
  );
}
