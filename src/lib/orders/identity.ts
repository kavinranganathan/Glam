import "server-only";

import { checkoutIdentity } from "./checkout-identity";

/** Shopper identity for order lookups: `{ user, sessionId }` (guest orders are matched by session). */
export async function orderIdentity(): Promise<{ user: { id: string } | null; sessionId: string | null }> {
  const { user, sessionId } = await checkoutIdentity();
  return { user, sessionId };
}

export { checkoutIdentity };
