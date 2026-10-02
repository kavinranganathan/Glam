import { z } from "zod";
import { ApiError, handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { requireUser } from "@/lib/auth/session";
import { PRO_MONTHS_PER_PURCHASE, activatePro } from "@/lib/account/pro";

const BodySchema = z.object({
  outcome: z.enum(["success", "failure"]),
  method: z.enum(["upi", "card", "wallet"]).default("upi"),
});

/** Simulated gateway callback: on success extends Pro by one month via `activate_pro`. */
export const POST = handle(async (req) => {
  const user = await requireUser();
  const { outcome, method } = await parseBody(req, BodySchema);
  if (outcome === "failure") {
    throw new ApiError(402, "PAYMENT_FAILED", `Your ${method.toUpperCase()} payment could not be completed. No money was deducted.`);
  }
  const proUntil = await activatePro(user.id, PRO_MONTHS_PER_PURCHASE);
  return ok({ proUntil, redirectUrl: "/pro?welcome=1" });
});
