import "server-only";

import { serviceClient } from "@/lib/supabase/service";

/** GLAM Pro price in paise (PRD: ₹299/month). */
export const PRO_PRICE_PAISE = 299 * 100;
export const PRO_MONTHS_PER_PURCHASE = 1;

export const PRO_BENEFITS = [
  { title: "Free delivery on every order", detail: "No minimum, every slot, all year" },
  { title: "Early access to flash sales", detail: "Shop 2 hours before everyone else" },
  { title: "Pro-only prices", detail: "Deeper discounts on 1,000+ products" },
  { title: "Pro-exclusive coupons", detail: "Monthly codes just for members" },
  { title: "Bonus rewards", detail: "Extra points on launches and brand days" },
] as const;

/**
 * Extends Pro by one month via the `activate_pro` DB function (which also sends the welcome notification).
 * Returns the new `pro_until` timestamp.
 */
export async function activatePro(userId: string, months = PRO_MONTHS_PER_PURCHASE): Promise<string> {
  const { data, error } = await serviceClient().rpc("activate_pro", { p_user: userId, p_months: months });
  if (error) throw error;
  if (typeof data !== "string") throw new Error("activate_pro returned no timestamp");
  return data;
}
