import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { parseQuery } from "@/lib/api/validate";
import { suggest } from "@/lib/catalogue/queries";

const schema = z.object({ q: z.string().max(100).optional().default("") });

/** GET /api/search/suggest?q= -> { products, brands, categories }. Empty arrays under 2 characters. */
export const GET = handle(async (req) => {
  const { q } = parseQuery(req, schema);
  if (q.trim().length < 2) return ok({ products: [], brands: [], categories: [] });
  return ok(await suggest(q));
});
