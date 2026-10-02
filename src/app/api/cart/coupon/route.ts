import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { getGuestSessionId } from "@/lib/auth/guest";
import { getUser } from "@/lib/auth/session";
import { applyCoupon, removeCoupon } from "@/lib/cart/service";
import type { CartIdentity } from "@/lib/cart/types";

const bodySchema = z.object({ code: z.string().trim().min(2).max(40) });

async function identity(): Promise<CartIdentity> {
  const [user, sessionId] = await Promise.all([getUser(), getGuestSessionId()]);
  return { user: user ? { id: user.id } : null, sessionId };
}

export const PUT = handle(async (req) => {
  const { code } = await parseBody(req, bodySchema);
  return ok(await applyCoupon(await identity(), code));
});

export const DELETE = handle(async () => ok(await removeCoupon(await identity())));
