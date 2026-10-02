import { z } from "zod";
import { rateLimit } from "@/lib/api/rate-limit";
import { ApiError, handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { addressInputSchema } from "@/lib/orders/address";
import { checkoutIdentity } from "@/lib/orders/checkout-identity";
import { placeOrder } from "@/lib/orders/service";

const PLACE_LIMIT_PER_MINUTE = 10;

const bodySchema = z.object({
  addressId: z.uuid().nullable().optional(),
  address: addressInputSchema.nullable().optional(),
  slot: z.enum(["standard", "next_day", "same_day"]).default("standard"),
  paymentMethod: z.enum(["upi", "card", "netbanking", "wallet", "emi", "bnpl", "cod"]),
  onlyItemIds: z.array(z.uuid()).max(50).nullable().optional(),
  guestEmail: z.email().nullable().optional(),
});

export const POST = handle(async (req) => {
  const identity = await checkoutIdentity();
  const key = `place:${identity.user?.id ?? identity.sessionId}`;
  if (!rateLimit(key, PLACE_LIMIT_PER_MINUTE, 60_000)) {
    throw new ApiError(429, "RATE_LIMITED", "Too many attempts. Please wait a minute and try again.");
  }
  const body = await parseBody(req, bodySchema);
  return ok(await placeOrder(identity, body), { status: 201 });
});
