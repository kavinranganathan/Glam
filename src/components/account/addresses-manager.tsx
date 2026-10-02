"use client";

import * as React from "react";
import { AddressList, type Address } from "@/components/account/address-fallback";

/** Client shell for /profile/addresses: refetches the list after every change. */
export function AddressesManager({ initial }: { initial: Address[] }) {
  const [addresses, setAddresses] = React.useState(initial);
  const reload = React.useCallback(async () => {
    try {
      const res = await fetch("/api/addresses", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as { addresses: Address[] };
        setAddresses(json.addresses);
      }
    } catch {
      // keep current list; the next action will retry
    }
  }, []);
  return <AddressList addresses={addresses} onChanged={reload} mode="manage" />;
}
