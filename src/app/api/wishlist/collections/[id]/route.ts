import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { requireUser } from "@/lib/auth/session";
import { deleteCollection, renameCollection } from "@/lib/wishlist/service";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({ name: z.string().trim().min(1).max(40) });

export const PATCH = handle<Ctx>(async (req, ctx) => {
  const { id } = await ctx.params;
  const { name } = await parseBody(req, bodySchema);
  const user = await requireUser();
  return ok(await renameCollection(user.id, z.uuid().parse(id), name));
});

export const DELETE = handle<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  const user = await requireUser();
  await deleteCollection(user.id, z.uuid().parse(id));
  return ok({ deleted: true });
});
