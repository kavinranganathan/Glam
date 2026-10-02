import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { requireUser } from "@/lib/auth/session";
import { createCollection, getCollections } from "@/lib/wishlist/service";

const bodySchema = z.object({ name: z.string().trim().min(1).max(40) });

export const GET = handle(async () => {
  const user = await requireUser();
  return ok({ collections: await getCollections(user.id) });
});

export const POST = handle(async (req) => {
  const { name } = await parseBody(req, bodySchema);
  const user = await requireUser();
  return ok(await createCollection(user.id, name), { status: 201 });
});
