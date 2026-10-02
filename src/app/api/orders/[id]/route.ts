import { ApiError, handle, ok } from "@/lib/api/respond";
import { orderIdentity } from "@/lib/orders/identity";
import { getOrder } from "@/lib/orders/queries";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  const order = await getOrder(id, await orderIdentity());
  if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
  return ok(order);
});
