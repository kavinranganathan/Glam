import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { parseQuery } from "@/lib/api/validate";
import { requireUser } from "@/lib/auth/session";
import { getWishlist } from "@/lib/wishlist/service";

const querySchema = z.object({ collection: z.uuid().optional() });

export const GET = handle(async (req) => {
  const q = parseQuery(req, querySchema);
  const user = await requireUser();
  return ok(await getWishlist(user.id, q.collection));
});
