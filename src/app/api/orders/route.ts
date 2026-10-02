import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { parseQuery } from "@/lib/api/validate";
import { requireUser } from "@/lib/auth/session";
import { listOrders } from "@/lib/orders/queries";
import { ALL_STATUSES } from "@/lib/orders/state-machine";

const querySchema = z.object({
  status: z.enum(["all", "active", "delivered", "cancelled", "returns", ...ALL_STATUSES]).optional(),
  q: z.string().max(40).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
});

export const GET = handle(async (req) => {
  const user = await requireUser();
  const q = parseQuery(req, querySchema);
  return ok(await listOrders(user.id, q));
});
