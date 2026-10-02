import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PaymentMethods, type SavedMethod } from "@/components/account/payment-methods";
import { getUser } from "@/lib/auth/session";
import { serviceClient } from "@/lib/supabase/service";

export const metadata: Metadata = { title: "Payment Methods" };

/** S43 saved payment methods. */
export default async function PaymentMethodsPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/profile/payments");
  const { data } = await serviceClient()
    .from("saved_payment_methods")
    .select("id, kind, label, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-text">Payment methods</h1>
      <p className="mt-1 mb-6 text-sm text-text-secondary">Saved UPI IDs and cards are pre-selected at checkout. Cash on Delivery is always available up to ₹20,000.</p>
      <PaymentMethods initial={(data ?? []) as SavedMethod[]} />
    </div>
  );
}
