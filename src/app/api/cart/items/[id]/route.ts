import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { getGuestSessionId } from "@/lib/auth/guest";
import { getUser } from "@/lib/auth/session";
import { removeItem, updateItem } from "@/lib/cart/service";
import type { CartIdentity } from "@/lib/cart/types";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z
  .object({
    qty: z.number().int().min(1).max(10).optional(),
    savedForLater: z.boolean().optional(),
  })
  .refine((b) => b.qty !== undefined || b.savedForLater !== undefined, { message: "Provide qty or savedForLater" });

async function identity(): Promise<CartIdentity> {
  const [user, sessionId] = await Promise.all([getUser(), getGuestSessionId()]);
  return { user: user ? { id: user.id } : null, sessionId };
}

export const PATCH = handle<Ctx>(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await parseBody(req, bodySchema);
  return ok(await updateItem(await identity(), z.uuid().parse(id), body));
});

export const DELETE = handle<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  return ok(await removeItem(await identity(), z.uuid().parse(id)));
});
