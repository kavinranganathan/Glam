import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { requireUser } from "@/lib/auth/session";
import { addressInputSchema } from "@/lib/orders/address";
import { deleteAddress, updateAddress } from "@/lib/orders/addresses";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = addressInputSchema.partial();

export const PATCH = handle<Ctx>(async (req, ctx) => {
  const { id } = await ctx.params;
  const user = await requireUser();
  const body = await parseBody(req, patchSchema);
  return ok(await updateAddress(user.id, z.uuid().parse(id), body));
});

export const DELETE = handle<Ctx>(async (_req, ctx) => {
  const { id } = await ctx.params;
  const user = await requireUser();
  await deleteAddress(user.id, z.uuid().parse(id));
  return ok({ deleted: true });
});
