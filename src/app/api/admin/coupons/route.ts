import { ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { adminHandle } from "@/lib/admin/route";
import { couponSchema } from "@/lib/admin/schemas";
import { createCoupon, listCoupons } from "@/lib/admin/service";

export const GET = adminHandle(async () => ok(await listCoupons()));

export const POST = adminHandle(async (req) => ok(await createCoupon(await parseBody(req, couponSchema)), { status: 201 }));
