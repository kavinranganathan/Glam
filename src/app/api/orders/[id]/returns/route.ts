import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { orderIdentity } from "@/lib/orders/identity";
import { createReturn } from "@/lib/returns/service";

type Ctx = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  items: z.array(z.object({ order_item_id: z.uuid(), qty: z.number().int().min(1).max(10) })).min(1, "Select at least one item."),
  reason: z.string().trim().min(1).max(60),
  comment: z.string().trim().max(1000).nullable().optional(),
  refund_method: z.enum(["original", "wallet"]),
  photos: z.array(z.string().max(2000)).max(3).optional(),
  pickup_address: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const POST = handle<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const body = await parseBody(req, bodySchema);
  const result = await createReturn(id, await orderIdentity(), {
    items: body.items,
    reason: body.reason,
    comment: body.comment ?? null,
    refund_method: body.refund_method,
    photos: body.photos ?? [],
    pickup_address: body.pickup_address ?? null,
  });
  return ok(result, { status: 201 });
});
