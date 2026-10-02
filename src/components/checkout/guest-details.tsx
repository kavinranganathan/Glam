"use client";

import * as React from "react";
import Link from "next/link";
import { Mail, MapPin, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addressSnapshot, formatAddressLines, type AddressInput } from "@/lib/orders/address";
import { AddressForm } from "./address-form";

/** Guest checkout details (PRD §8.1.3): email for order updates + a one-off delivery address. */
export function GuestDetails({
  email,
  onEmail,
  address,
  onAddress,
}: {
  email: string;
  onEmail: (v: string) => void;
  address: AddressInput | null;
  onAddress: (a: AddressInput) => void;
}) {
  const [editing, setEditing] = React.useState(!address);
  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-card bg-surface px-3 py-2 text-sm text-text-secondary">
        Checking out as a guest.{" "}
        <Link href="/login?next=/checkout" className="font-semibold text-primary">
          Sign in
        </Link>{" "}
        to use saved addresses, coupons and GLAM Rewards.
      </p>
      <Input
        label="Email for order updates"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => onEmail(e.target.value)}
        placeholder="you@example.com"
        leading={<Mail className="h-4 w-4" aria-hidden />}
      />
      {address && !editing ? (
        <div className="flex items-start justify-between gap-3 rounded-card border border-border p-3">
          <div className="flex gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="font-semibold text-text">
                {address.name} · {address.phone}
              </p>
              {formatAddressLines(addressSnapshot(address)).map((l) => (
                <p key={l} className="text-text-secondary">
                  {l}
                </p>
              ))}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" aria-hidden /> Edit
          </Button>
        </div>
      ) : (
        <AddressForm
          initial={address ?? undefined}
          onSaved={() => {}}
          onSubmitLocal={(input) => {
            onAddress(input);
            setEditing(false);
          }}
          onCancel={address ? () => setEditing(false) : undefined}
          submitLabel="Use this address"
        />
      )}
    </div>
  );
}
