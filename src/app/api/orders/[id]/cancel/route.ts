import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { orderIdentity } from "@/lib/orders/identity";
import { cancelOrder } from "@/lib/orders/queries";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({ reason: z.string().trim().min(1, "Please choose a reason.").max(200) });

export const POST = handle<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const body = await parseBody(req, bodySchema);
  return ok(await cancelOrder(id, await orderIdentity(), body.reason));
});
