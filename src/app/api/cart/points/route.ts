import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { getGuestSessionId } from "@/lib/auth/guest";
import { requireUser } from "@/lib/auth/session";
import { setUsePoints } from "@/lib/cart/service";

const bodySchema = z.object({ usePoints: z.boolean() });

export const PUT = handle(async (req) => {
  const { usePoints } = await parseBody(req, bodySchema);
  const [user, sessionId] = await Promise.all([requireUser(), getGuestSessionId()]);
  return ok(await setUsePoints({ user: { id: user.id }, sessionId }, usePoints));
});
