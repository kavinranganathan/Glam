"use client";

import { PincodeCheck } from "@/components/product/pincode-check";
import { usePdp } from "./pdp-context";

/** Binds the pincode/stock widget to the selected variant. */
export function PdpPincode() {
  const { variant } = usePdp();
  return <PincodeCheck stock={variant.stock} />;
}
