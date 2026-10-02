import { z } from "zod";
import type { Tables } from "@/lib/supabase/types";

/** Shared address contract (checkout + profile). */
export interface Address {
  id: string;
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

/** Snapshot stored on `orders.address` (jsonb). */
export type AddressSnapshot = Omit<Address, "id" | "isDefault">;

export const ADDRESS_LABELS = ["Home", "Work", "Other"] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v.length ? v : null))
    .nullable()
    .optional();

export const addressInputSchema = z.object({
  label: z.string().trim().min(1, "Choose a label").max(30, "Label is too long"),
  name: z.string().trim().min(2, "Enter the recipient's name").max(80),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, "").replace(/^(\+91|0)/, ""))
    .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")),
  line1: z.string().trim().min(3, "Enter your house / flat and street").max(120),
  line2: optionalText(120),
  landmark: optionalText(80),
  city: z.string().trim().min(2, "Enter your city").max(60),
  state: z.string().trim().min(2, "Enter your state").max(60),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  isDefault: z.boolean().optional(),
});

export type AddressInput = z.infer<typeof addressInputSchema>;

export function toAddress(row: Tables<"addresses">): Address {
  return {
    id: row.id,
    label: row.label,
    name: row.name,
    phone: row.phone,
    line1: row.line1,
    line2: row.line2,
    landmark: row.landmark,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    isDefault: row.is_default,
  };
}

export function addressSnapshot(a: Address | AddressInput): AddressSnapshot {
  return {
    label: a.label,
    name: a.name,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2 ?? null,
    landmark: a.landmark ?? null,
    city: a.city,
    state: a.state,
    pincode: a.pincode,
  };
}

/** Display lines: street, landmark, "City, State 560001". */
export function formatAddressLines(a: AddressSnapshot | Address): string[] {
  const lines = [[a.line1, a.line2].filter(Boolean).join(", ")];
  if (a.landmark) lines.push(`Landmark: ${a.landmark}`);
  lines.push(`${a.city}, ${a.state} ${a.pincode}`);
  return lines;
}
