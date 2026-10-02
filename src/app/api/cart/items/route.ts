import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { getGuestSessionId } from "@/lib/auth/guest";
import { getUser } from "@/lib/auth/session";
import { addItem } from "@/lib/cart/service";

const bodySchema = z.object({
  variantId: z.uuid(),
  qty: z.number().int().min(1).max(10).optional(),
});

export const POST = handle(async (req) => {
  const body = await parseBody(req, bodySchema);
  const [user, sessionId] = await Promise.all([getUser(), getGuestSessionId()]);
  const view = await addItem({ user: user ? { id: user.id } : null, sessionId }, body.variantId, body.qty ?? 1);
  return ok(view, { status: 201 });
});
