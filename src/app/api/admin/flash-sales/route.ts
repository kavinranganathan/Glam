import { ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { adminHandle } from "@/lib/admin/route";
import { flashSaleSchema } from "@/lib/admin/schemas";
import { createFlashSale, listFlashSales } from "@/lib/admin/service";

export const GET = adminHandle(async () => ok(await listFlashSales()));

/** POST /api/admin/flash-sales { name, starts_at, ends_at, banner_url?, is_active, items: [{ product_id, sale_price }] } */
export const POST = adminHandle(async (req) => ok(await createFlashSale(await parseBody(req, flashSaleSchema)), { status: 201 }));
