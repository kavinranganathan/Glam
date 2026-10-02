import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { requireUser } from "@/lib/auth/session";
import { moveItem, removeItem } from "@/lib/wishlist/service";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({ collectionId: z.uuid() });

export const PATCH = handle<Ctx>(async (req, ctx) => {
  const { id } = await ctx.params;
  const { collectionId } = await parseBody(req, bodySchema);
  const user = await requireUser();
  await moveItem(user.id, z.uuid().parse(id), collectionId);
  return ok({ moved: true });
});

export const DELETE = handle<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  const user = await requireUser();
  await removeItem(user.id, z.uuid().parse(id));
  return ok({ removed: true });
});
