import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AddressesManager } from "@/components/account/addresses-manager";
import { getUser } from "@/lib/auth/session";
import { listAddresses } from "@/lib/orders/addresses";

export const metadata: Metadata = { title: "Addresses" };

/** Manage delivery addresses: list, add, edit, delete, set default. */
export default async function AddressesPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/profile/addresses");
  const addresses = await listAddresses(user.id).catch(() => []);
  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-text">Addresses</h1>
      <p className="mt-1 mb-6 text-sm text-text-secondary">Your default address is pre-selected at checkout.</p>
      <AddressesManager initial={addresses} />
    </div>
  );
}
