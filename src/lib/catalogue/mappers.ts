/**
 * Row -> view-model mappers for the catalogue. Pure: no I/O, safe to unit test.
 */
import type { Tables } from "@/lib/supabase/types";
import { discountPercent } from "@/lib/utils/money";
import type { CategoryNode, ProductCard, ProductDetail, VariantView } from "./types";

export const BEST_SELLER_MIN_SOLD = 1500;
export const NEW_BADGE_DAYS = 30;
export const LOW_STOCK_MAX = 3;

/** Embedded select used for every ProductCard fetch. `stk` is an alias used only for inner-join filters. */
export const CARD_SELECT =
  "*, brand:brands(id,slug,name,tier), variants(id,sku,name,kind,shade_hex,price,mrp,stock,is_default,position), stk:variants!inner(id)" as const;

export const DETAIL_SELECT =
  "*, brand:brands(*), category:categories(*), variants(id,sku,name,kind,shade_hex,price,mrp,stock,is_default,position)" as const;

export type ProductRow = Tables<"products">;
export type BrandLite = { id: string; slug: string; name: string; tier?: number };
export type VariantRow = Pick<
  Tables<"variants">,
  "id" | "sku" | "name" | "kind" | "shade_hex" | "price" | "mrp" | "stock" | "is_default" | "position"
>;

export type CardRow = ProductRow & { brand: BrandLite | null; variants: VariantRow[] | null };
export type DetailRow = ProductRow & {
  brand: Tables<"brands"> | null;
  category: Tables<"categories"> | null;
  variants: VariantRow[] | null;
};

export interface CardOptions {
  /** product id -> sale price for the active flash sale. */
  flashPrices?: ReadonlyMap<string, number> | null;
  now?: Date;
  /** Set by callers for brand tier-1 slots (search results, PLP). */
  sponsored?: boolean;
}

export function offerLabel(offerType: "none" | "bxgy", buy: number, get: number): string | null {
  if (offerType !== "bxgy" || buy <= 0 || get <= 0) return null;
  return `Buy ${buy} Get ${get} Free`;
}

export function sortVariants(variants: VariantRow[] | null | undefined): VariantRow[] {
  return [...(variants ?? [])].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
}

export function defaultVariant(variants: VariantRow[]): VariantRow | undefined {
  return variants.find((v) => v.is_default) ?? variants[0];
}

export function isNewLaunch(launchedAt: string, now: Date, days = NEW_BADGE_DAYS): boolean {
  const t = new Date(launchedAt).getTime();
  if (!Number.isFinite(t)) return false;
  const age = now.getTime() - t;
  return age >= 0 && age <= days * 24 * 60 * 60 * 1000;
}

export function toVariantView(v: VariantRow): VariantView {
  return {
    id: v.id,
    sku: v.sku,
    name: v.name,
    kind: v.kind,
    shadeHex: v.shade_hex,
    price: v.price,
    mrp: v.mrp,
    stock: v.stock,
    isDefault: v.is_default,
  };
}

export function toProductCard(row: CardRow, opts: CardOptions = {}): ProductCard {
  const now = opts.now ?? new Date();
  const variants = sortVariants(row.variants);
  const def = defaultVariant(variants);
  const flashPrice = opts.flashPrices?.get(row.id) ?? null;
  const effective = flashPrice ?? row.price;

  const badges: ProductCard["badges"] = [];
  if (row.sold_count >= BEST_SELLER_MIN_SOLD) badges.push("best_seller");
  if (isNewLaunch(row.launched_at, now)) badges.push("new");
  if (flashPrice !== null) badges.push("limited");
  if (opts.sponsored) badges.push("sponsored");

  const defStock = def?.stock ?? 0;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand
      ? { id: row.brand.id, slug: row.brand.slug, name: row.brand.name }
      : { id: row.brand_id, slug: "", name: "" },
    image: row.images[0] ?? "",
    price: row.price,
    mrp: row.mrp,
    proPrice: row.pro_price,
    flashPrice,
    discountPct: discountPercent(row.mrp, effective),
    ratingAvg: Number(row.rating_avg),
    ratingCount: row.rating_count,
    badges,
    offerLabel: offerLabel(row.offer_type, row.offer_buy, row.offer_get),
    inStock: variants.some((v) => v.stock > 0),
    lowStock: defStock >= 1 && defStock <= LOW_STOCK_MAX,
    hasVariants: variants.length > 1,
    defaultVariantId: def?.id ?? "",
    categoryId: row.category_id,
  };
}

function asRoot(root: string): ProductDetail["category"]["root"] {
  return root === "fashion" || root === "wellness" ? root : "beauty";
}

export function toProductDetail(
  row: DetailRow,
  categoryPath: Array<Pick<CategoryNode, "id" | "slug" | "name">>,
  opts: CardOptions = {},
): ProductDetail {
  const card = toProductCard(row, opts);
  const variants = sortVariants(row.variants);
  const cat = row.category;
  return {
    ...card,
    description: row.description,
    benefits: row.benefits,
    ingredients: row.ingredients,
    flaggedIngredients: row.flagged_ingredients,
    howToUse: row.how_to_use,
    certifications: row.certifications,
    skinTypes: row.skin_types,
    concerns: row.concerns,
    freeFrom: row.free_from,
    finish: row.finish,
    images: row.images,
    videoUrl: row.video_url,
    variants: variants.map(toVariantView),
    brandAbout: row.brand?.about ?? null,
    brandLogo: row.brand?.logo_url ?? null,
    brandVerified: row.brand?.verified ?? false,
    nonReturnable: row.non_returnable,
    offerType: row.offer_type,
    offerBuy: row.offer_buy,
    offerGet: row.offer_get,
    soldCount: row.sold_count,
    launchedAt: row.launched_at,
    category: cat
      ? { id: cat.id, slug: cat.slug, name: cat.name, root: asRoot(cat.root), returnWindowDays: cat.return_window_days }
      : { id: row.category_id, slug: "", name: "", root: "beauty", returnWindowDays: 30 },
    categoryPath: categoryPath.map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
  };
}
