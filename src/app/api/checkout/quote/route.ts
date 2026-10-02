import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { checkoutIdentity } from "@/lib/orders/checkout-identity";
import { quoteCheckout } from "@/lib/orders/service";

const bodySchema = z.object({
  addressId: z.uuid().nullable().optional(),
  pincode: z.string().regex(/^\d{6}$/).nullable().optional(),
  slot: z.enum(["standard", "next_day", "same_day"]).optional(),
  paymentMethod: z.enum(["upi", "card", "netbanking", "wallet", "emi", "bnpl", "cod", "giftcard"]).optional(),
  onlyItemIds: z.array(z.uuid()).max(50).nullable().optional(),
});

export const POST = handle(async (req) => {
  const body = await parseBody(req, bodySchema);
  return ok(await quoteCheckout(await checkoutIdentity(), body));
});
