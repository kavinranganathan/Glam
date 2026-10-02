import { handle, ok } from "@/lib/api/respond";
import { requireUser } from "@/lib/auth/session";
import { PRO_PRICE_PAISE } from "@/lib/account/pro";

/**
 * Starts a GLAM Pro purchase. The gateway is simulated, so this only hands the client the
 * payment page; `/api/pro/confirm` records the outcome.
 */
export const POST = handle(async () => {
  const user = await requireUser();
  return ok({ redirectUrl: "/pro/pay", amount: PRO_PRICE_PAISE, extending: user.isPro, proUntil: user.pro_until });
});
