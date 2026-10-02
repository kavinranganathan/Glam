import { handle, ok } from "@/lib/api/respond";
import { listProducts } from "@/lib/catalogue/queries";
import { parseListFilters } from "@/lib/catalogue/search";

/** GET /api/products?<list filters> -> ListResult. Used by PLP infinite scroll. */
export const GET = handle(async (req) => {
  const filters = parseListFilters(new URL(req.url).searchParams);
  return ok(await listProducts(filters));
});
