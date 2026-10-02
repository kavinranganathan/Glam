import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { parseQuery } from "@/lib/api/validate";
import { getGuestSessionId } from "@/lib/auth/guest";
import { getUser } from "@/lib/auth/session";
import { clearCart, getCartView } from "@/lib/cart/service";
import type { CartIdentity } from "@/lib/cart/types";

const querySchema = z.object({
  pincode: z.string().regex(/^\d{6}$/).optional(),
  payment_method: z.enum(["upi", "card", "netbanking", "wallet", "emi", "bnpl", "cod", "giftcard"]).optional(),
});

async function identity(): Promise<CartIdentity> {
  const [user, sessionId] = await Promise.all([getUser(), getGuestSessionId()]);
  return { user: user ? { id: user.id } : null, sessionId };
}

export const GET = handle(async (req) => {
  const q = parseQuery(req, querySchema);
  const view = await getCartView(await identity(), { pincode: q.pincode, paymentMethod: q.payment_method ?? null });
  return ok(view);
});

export const DELETE = handle(async () => ok(await clearCart(await identity())));
