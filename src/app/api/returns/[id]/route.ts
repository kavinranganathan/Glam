import { ApiError, handle, ok } from "@/lib/api/respond";
import { orderIdentity } from "@/lib/orders/identity";
import { getReturn } from "@/lib/returns/service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  const ret = await getReturn(id, await orderIdentity());
  if (!ret) throw new ApiError(404, "RETURN_NOT_FOUND", "Return not found.");
  return ok(ret);
});
