import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { orderIdentity } from "@/lib/orders/identity";
import { requestReschedule } from "@/lib/orders/queries";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date") });

export const POST = handle<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const body = await parseBody(req, bodySchema);
  return ok(await requestReschedule(id, await orderIdentity(), body.date));
});
