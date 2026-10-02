import "server-only";

import { ApiError } from "@/lib/api/respond";
import { getProductIdBySlug } from "@/lib/catalogue/queries";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Product-scoped API routes live under `/api/products/[slug]` (Next forbids a sibling `[id]`
 * segment). The contract is the product UUID; slugs are accepted as a convenience.
 */
export async function resolveProductId(param: string): Promise<string> {
  if (UUID_RE.test(param)) return param.toLowerCase();
  const id = await getProductIdBySlug(param);
  if (!id) throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  return id;
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
