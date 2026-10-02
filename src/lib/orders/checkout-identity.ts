import "server-only";

import { getGuestSessionId } from "@/lib/auth/guest";
import { getUser } from "@/lib/auth/session";
import type { CheckoutIdentity } from "./types";

/** Current shopper for cart/checkout services: signed-in user or guest session cookie. */
export async function checkoutIdentity(): Promise<CheckoutIdentity> {
  const [user, sessionId] = await Promise.all([getUser(), getGuestSessionId()]);
  return { user: user ? { id: user.id } : null, sessionId, email: user?.email ?? user?.authEmail ?? null };
}
