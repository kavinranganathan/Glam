import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { parseQuery } from "@/lib/api/validate";
import { getGuestSessionId } from "@/lib/auth/guest";
import { getUser } from "@/lib/auth/session";
import { getAvailableCoupons } from "@/lib/cart/service";

const querySchema = z.object({
  pincode: z.string().regex(/^\d{6}$/).optional(),
  payment_method: z.enum(["upi", "card", "netbanking", "wallet", "emi", "bnpl", "cod", "giftcard"]).optional(),
});

export const GET = handle(async (req) => {
  const q = parseQuery(req, querySchema);
  const [user, sessionId] = await Promise.all([getUser(), getGuestSessionId()]);
  const coupons = await getAvailableCoupons({ user: user ? { id: user.id } : null, sessionId }, { pincode: q.pincode, paymentMethod: q.payment_method ?? null });
  return ok({ coupons });
});
