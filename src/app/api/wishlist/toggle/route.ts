import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { requireUser } from "@/lib/auth/session";
import { toggleWishlist } from "@/lib/wishlist/service";

const bodySchema = z.object({
  productId: z.uuid(),
  variantId: z.uuid().nullable().optional(),
  collectionId: z.uuid().optional(),
});

export const POST = handle(async (req) => {
  const body = await parseBody(req, bodySchema);
  const user = await requireUser();
  return ok(await toggleWishlist(user.id, body.productId, body.variantId ?? null, body.collectionId));
});
