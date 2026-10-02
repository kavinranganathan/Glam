import { handle, ok } from "@/lib/api/respond";
import { orderIdentity } from "@/lib/orders/identity";
import { reorder } from "@/lib/orders/queries";

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  return ok(await reorder(id, await orderIdentity()));
});
