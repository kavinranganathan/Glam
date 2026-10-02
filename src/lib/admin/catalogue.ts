import "server-only";

import { ApiError } from "@/lib/api/respond";
import { notifyBackInStock, notifyPriceDrops } from "@/lib/notifications/service";
import { serviceClient } from "@/lib/supabase/service";

export interface AdminVariant {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
}

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  image: string | null;
  price: number;
  mrp: number;
  proPrice: number | null;
  isActive: boolean;
  variants: AdminVariant[];
}

type Row = {
  id: string;
  slug: string;
  name: string;
  images: string[];
  price: number;
  mrp: number;
  pro_price: number | null;
  is_active: boolean;
  brands: { name: string } | null;
  variants: Array<{ id: string; sku: string; name: string; price: number; stock: number; position: number }>;
};

const SELECT = "id, slug, name, images, price, mrp, pro_price, is_active, brands(name), variants(id, sku, name, price, stock, position)";

/** Products for the stock editor: name/SKU search, or low-stock first when no query. */
export async function searchAdminProducts(q?: string, limit = 30): Promise<AdminProduct[]> {
  const db = serviceClient();
  const term = q?.trim();
  let query = db.from("products").select(SELECT).limit(limit);
  if (term) {
    const like = `%${term.replace(/[%_,()]/g, "")}%`;
    const { data: bySku } = await db.from("variants").select("product_id").ilike("sku", like).limit(limit);
    const ids = [...new Set((bySku ?? []).map((v) => v.product_id))];
    const parts = [`name.ilike.${like}`, `slug.ilike.${like}`];
    if (ids.length) parts.push(`id.in.(${ids.join(",")})`);
    query = query.or(parts.join(",")).order("name");
  } else {
    query = query.order("updated_at", { ascending: false });
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as Row[]).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brands?.name ?? "",
    image: p.images[0] ?? null,
    price: p.price,
    mrp: p.mrp,
    proPrice: p.pro_price,
    isActive: p.is_active,
    variants: [...p.variants].sort((a, b) => a.position - b.position).map((v) => ({ id: v.id, sku: v.sku, name: v.name, price: v.price, stock: v.stock })),
  }));
}

/** Low-stock variants (stock ≤ threshold) for the dashboard. */
export async function listLowStock(threshold: number, limit = 20) {
  const { data, error } = await serviceClient()
    .from("variants")
    .select("id, sku, name, stock, products(name, slug)")
    .lte("stock", threshold)
    .order("stock")
    .limit(limit);
  if (error) throw error;
  return (data as unknown as Array<{ id: string; sku: string; name: string; stock: number; products: { name: string; slug: string } | null }>).map((v) => ({
    id: v.id,
    sku: v.sku,
    name: v.name,
    stock: v.stock,
    productName: v.products?.name ?? "",
    productSlug: v.products?.slug ?? "",
  }));
}

/** Updates stock; fires back-in-stock alerts when it goes from 0 to >0. Returns alerts sent. */
export async function updateVariantStock(variantId: string, stock: number): Promise<{ stock: number; notified: number }> {
  const db = serviceClient();
  const { data: before, error } = await db.from("variants").select("stock").eq("id", variantId).maybeSingle();
  if (error) throw error;
  if (!before) throw new ApiError(404, "NOT_FOUND", "Variant not found.");
  const { error: upError } = await db.from("variants").update({ stock }).eq("id", variantId);
  if (upError) throw upError;
  const notified = before.stock === 0 && stock > 0 ? await notifyBackInStock(variantId) : 0;
  return { stock, notified };
}

export interface PricingPatch {
  price?: number;
  mrp?: number;
  pro_price?: number | null;
  is_active?: boolean;
}

/** Updates product pricing/visibility; fires price-drop alerts when the price falls. */
export async function updateProductPricing(productId: string, patch: PricingPatch): Promise<{ notified: number }> {
  const db = serviceClient();
  const { data: before, error } = await db.from("products").select("price, mrp").eq("id", productId).maybeSingle();
  if (error) throw error;
  if (!before) throw new ApiError(404, "NOT_FOUND", "Product not found.");
  const nextPrice = patch.price ?? before.price;
  const nextMrp = patch.mrp ?? before.mrp;
  if (nextPrice > nextMrp) throw new ApiError(422, "VALIDATION", "Price cannot exceed MRP.");
  if (patch.pro_price != null && patch.pro_price > nextPrice) {
    throw new ApiError(422, "VALIDATION", "Pro price cannot exceed the regular price.");
  }
  const { error: upError } = await db.from("products").update(patch).eq("id", productId);
  if (upError) throw upError;
  const notified = patch.price !== undefined && patch.price < before.price ? await notifyPriceDrops(productId) : 0;
  return { notified };
}
