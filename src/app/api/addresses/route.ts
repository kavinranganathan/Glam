import { handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { requireUser } from "@/lib/auth/session";
import { addressInputSchema } from "@/lib/orders/address";
import { createAddress, listAddresses } from "@/lib/orders/addresses";

export const GET = handle(async () => {
  const user = await requireUser();
  return ok({ addresses: await listAddresses(user.id) });
});

export const POST = handle(async (req) => {
  const user = await requireUser();
  const body = await parseBody(req, addressInputSchema);
  return ok(await createAddress(user.id, body), { status: 201 });
});
