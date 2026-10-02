import "server-only";

import { serviceClient } from "@/lib/supabase/service";
import { CARD_SELECT, type CardRow } from "@/lib/catalogue/mappers";
import {
  categoryScopeIds,
  getActiveFlashSale,
  getProductsByIds,
  siblingCategories,
  topLevelCategoryOf,
} from "@/lib/catalogue/queries";
import { getRecentlyViewed } from "@/lib/catalogue/recently-viewed";
import { toProductCard } from "@/lib/catalogue/mappers";
import type { ProductCard, ProductDetail, Shelf } from "@/lib/catalogue/types";
import { scoreForProfile } from "./scoring";

type Viewer = { id: string } | null;
type ShelfKey = "personalised" | "trending" | "new_launches" | "brands_you_love" | "continue_shopping" | "best_sellers";

const MIN_SHELF_ITEMS = 4;
const NEW_LAUNCH_DAYS = 14;
const PERSONALISED_POOL = 400;

const SHELF_META: Record<ShelfKey, { title: string; subtitle?: string; href?: string }> = {
  personalised: { title: "Personalised for You", subtitle: "Picked for your skin profile", href: "/profile/beauty" },
  trending: { title: "Trending Today", href: "/search?sort=popularity" },
  new_launches: { title: "New Launches", href: "/search?sort=newest" },
  brands_you_love: { title: "From Brands You Love" },
  continue_shopping: { title: "Continue Shopping" },
  best_sellers: { title: "Best Sellers", href: "/search?sort=popularity" },
};

async function cards(rows: CardRow[]): Promise<ProductCard[]> {
  const flash = await getActiveFlashSale();
  const now = new Date();
  return rows.map((r) => toProductCard(r, { flashPrices: flash?.prices, now }));
}

async function topBySold(limit: number, categoryIds?: string[] | null, excludeIds: string[] = []): Promise<ProductCard[]> {
  let q = serviceClient().from("products").select(CARD_SELECT).eq("is_active", true);
  if (categoryIds?.length) q = q.in("category_id", categoryIds);
  if (excludeIds.length) q = q.not("id", "in", `(${excludeIds.join(",")})`);
  const { data, error } = await q.order("sold_count", { ascending: false }).order("id").limit(limit);
  if (error) throw error;
  return cards(data as CardRow[]);
}

async function bestSellers(): Promise<ProductCard[]> {
  return topBySold(10);
}

async function personalised(user: Viewer): Promise<ProductCard[]> {
  if (!user) return [];
  const sb = serviceClient();
  const { data: bp, error: bpError } = await sb
    .from("beauty_profiles")
    .select("skin_type,concerns,budget")
    .eq("user_id", user.id)
    .maybeSingle();
  if (bpError) throw bpError;
  if (!bp) return [];
  const { data, error } = await sb
    .from("products")
    .select(CARD_SELECT)
    .eq("is_active", true)
    .order("sold_count", { ascending: false })
    .limit(PERSONALISED_POOL);
  if (error) throw error;
  const now = new Date();
  const profile = { skinType: bp.skin_type, concerns: bp.concerns, budget: bp.budget };
  const ranked = (data as CardRow[])
    .map((row) => ({
      row,
      score: scoreForProfile(
        { skinTypes: row.skin_types, concerns: row.concerns, price: row.price, soldCount: row.sold_count, launchedAt: row.launched_at },
        profile,
        now,
      ),
    }))
    .sort((a, b) => b.score - a.score || b.row.sold_count - a.row.sold_count)
    .slice(0, 20)
    .map((x) => x.row);
  return cards(ranked);
}

/** Product ids the user has ordered (any status). */
async function orderedProductIds(userId: string): Promise<string[]> {
  const { data, error } = await serviceClient()
    .from("order_items")
    .select("product_id, order:orders!inner(user_id)")
    .eq("order.user_id", userId)
    .limit(500);
  if (error) throw error;
  return data.map((r) => r.product_id).filter((id): id is string => Boolean(id));
}

async function trending(user: Viewer): Promise<ProductCard[]> {
  if (user) {
    const bought = await orderedProductIds(user.id);
    if (bought.length) {
      const { data, error } = await serviceClient().from("products").select("id,category_id").in("id", [...new Set(bought)]);
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const id of bought) {
        const cat = data.find((p) => p.id === id)?.category_id;
        if (cat) counts.set(cat, (counts.get(cat) ?? 0) + 1);
      }
      const topLeaf = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      const top = topLeaf ? await topLevelCategoryOf(topLeaf) : null;
      const scope = top ? await categoryScopeIds(top.slug) : null;
      if (scope) {
        const scoped = await topBySold(20, scope);
        if (scoped.length >= MIN_SHELF_ITEMS) return scoped;
      }
    }
  }
  return topBySold(20);
}

async function newLaunches(): Promise<ProductCard[]> {
  const since = new Date(Date.now() - NEW_LAUNCH_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await serviceClient()
    .from("products")
    .select(CARD_SELECT)
    .eq("is_active", true)
    .gte("launched_at", since)
    .order("launched_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const rows = (data as CardRow[])
    .sort((a, b) => (a.brand?.tier ?? 2) - (b.brand?.tier ?? 2) || b.launched_at.localeCompare(a.launched_at))
    .slice(0, 20);
  return cards(rows);
}

async function brandsYouLove(user: Viewer): Promise<ProductCard[]> {
  if (!user) return [];
  const sb = serviceClient();
  const [bought, follows, viewed] = await Promise.all([
    orderedProductIds(user.id),
    sb.from("brand_follows").select("brand_id").eq("user_id", user.id),
    sb.from("recently_viewed").select("product_id").eq("user_id", user.id).order("viewed_at", { ascending: false }).limit(50),
  ]);
  if (follows.error) throw follows.error;
  if (viewed.error) throw viewed.error;
  const productIds = [...new Set([...bought, ...viewed.data.map((r) => r.product_id)])];
  const brandIds = new Set(follows.data.map((r) => r.brand_id));
  if (productIds.length) {
    const { data, error } = await sb.from("products").select("brand_id").in("id", productIds);
    if (error) throw error;
    for (const p of data) brandIds.add(p.brand_id);
  }
  if (!brandIds.size) return [];
  const { data, error } = await sb
    .from("products")
    .select(CARD_SELECT)
    .eq("is_active", true)
    .in("brand_id", [...brandIds])
    .order("launched_at", { ascending: false })
    .order("id")
    .limit(20);
  if (error) throw error;
  return cards(data as CardRow[]);
}

/**
 * Home shelves in PRD order, keeping only shelves with at least 4 items. Each shelf is isolated:
 * the first failure is replaced by a Best Sellers shelf, later failures are dropped.
 */
export async function homeShelves(user: Viewer, sessionId: string): Promise<Shelf[]> {
  const loaders: Array<[ShelfKey, () => Promise<ProductCard[]>]> = [
    ["personalised", () => personalised(user)],
    ["trending", () => trending(user)],
    ["new_launches", () => newLaunches()],
    ["brands_you_love", () => brandsYouLove(user)],
    ["continue_shopping", () => getRecentlyViewed(user, sessionId, 10)],
    ["best_sellers", () => bestSellers()],
  ];

  const settled = await Promise.all(
    loaders.map(async ([key, load]): Promise<{ key: ShelfKey; items: ProductCard[] | null }> => {
      try {
        return { key, items: await load() };
      } catch (e) {
        console.error(`[shelves] ${key} failed`, e);
        return { key, items: null };
      }
    }),
  );

  const shelves: Shelf[] = [];
  let fallbackUsed = false;
  let fallbackItems: ProductCard[] | null = null;
  for (const { key, items } of settled) {
    if (items) {
      if (items.length >= MIN_SHELF_ITEMS) shelves.push({ key, ...SHELF_META[key], items });
      continue;
    }
    if (fallbackUsed) continue;
    fallbackUsed = true;
    try {
      fallbackItems = settled.find((s) => s.key === "best_sellers")?.items ?? (await bestSellers());
    } catch (e) {
      console.error("[shelves] best sellers fallback failed", e);
      continue;
    }
    if (fallbackItems.length >= MIN_SHELF_ITEMS) {
      shelves.push({ key: `${key}_fallback`, ...SHELF_META.best_sellers, items: fallbackItems });
    }
  }
  if (fallbackUsed && shelves.some((s) => s.key.endsWith("_fallback"))) {
    // Avoid showing Best Sellers twice when it already stood in for a failed shelf.
    const idx = shelves.findIndex((s) => s.key === "best_sellers");
    if (idx >= 0) shelves.splice(idx, 1);
  }
  return shelves;
}

export interface RelatedProducts {
  /** Frequently bought together: sibling-category picks at or below this product's price. */
  fbt: ProductCard[];
  alsoLike: ProductCard[];
  alsoViewed: ProductCard[];
}

async function frequentlyBoughtTogether(product: ProductDetail): Promise<ProductCard[]> {
  const siblings = await siblingCategories(product.categoryId);
  const ids = siblings.map((c) => c.id);
  if (!ids.length) return [];
  const { data, error } = await serviceClient()
    .from("products")
    .select(CARD_SELECT)
    .eq("is_active", true)
    .in("category_id", ids)
    .lte("price", product.price)
    .neq("id", product.id)
    .order("sold_count", { ascending: false })
    .order("id")
    .limit(3);
  if (error) throw error;
  return cards(data as CardRow[]);
}

async function alsoLike(product: ProductDetail): Promise<ProductCard[]> {
  const { data, error } = await serviceClient()
    .from("products")
    .select(CARD_SELECT)
    .eq("is_active", true)
    .eq("category_id", product.categoryId)
    .neq("id", product.id)
    .order("sold_count", { ascending: false })
    .order("id")
    .limit(20);
  if (error) throw error;
  return cards(data as CardRow[]);
}

async function alsoViewed(product: ProductDetail): Promise<ProductCard[]> {
  const sb = serviceClient();
  const { data: viewers, error } = await sb
    .from("recently_viewed")
    .select("user_id,session_id")
    .eq("product_id", product.id)
    .order("viewed_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const userIds = [...new Set(viewers.map((v) => v.user_id).filter((v): v is string => Boolean(v)))];
  const sessionIds = [...new Set(viewers.map((v) => v.session_id).filter((v): v is string => Boolean(v)))];

  const ranked = new Map<string, number>();
  if (userIds.length || sessionIds.length) {
    const parts: string[] = [];
    if (userIds.length) parts.push(`user_id.in.(${userIds.join(",")})`);
    if (sessionIds.length) parts.push(`session_id.in.(${sessionIds.map((s) => `"${s}"`).join(",")})`);
    const { data: rows, error: rowsError } = await sb
      .from("recently_viewed")
      .select("product_id,viewed_at")
      .or(parts.join(","))
      .neq("product_id", product.id)
      .order("viewed_at", { ascending: false })
      .limit(500);
    if (rowsError) throw rowsError;
    for (const r of rows) ranked.set(r.product_id, (ranked.get(r.product_id) ?? 0) + 1);
  }
  const ids = [...ranked.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => id);
  if (ids.length) {
    const found = await getProductsByIds(ids);
    if (found.length) return found;
  }
  const { data, error: brandError } = await sb
    .from("products")
    .select(CARD_SELECT)
    .eq("is_active", true)
    .eq("brand_id", product.brand.id)
    .neq("id", product.id)
    .order("sold_count", { ascending: false })
    .order("id")
    .limit(10);
  if (brandError) throw brandError;
  return cards(data as CardRow[]);
}

export async function relatedProducts(product: ProductDetail): Promise<RelatedProducts> {
  const safe = async (label: string, fn: () => Promise<ProductCard[]>): Promise<ProductCard[]> => {
    try {
      return await fn();
    } catch (e) {
      console.error(`[related] ${label} failed`, e);
      return [];
    }
  };
  const [fbt, like, viewed] = await Promise.all([
    safe("fbt", () => frequentlyBoughtTogether(product)),
    safe("alsoLike", () => alsoLike(product)),
    safe("alsoViewed", () => alsoViewed(product)),
  ]);
  return { fbt, alsoLike: like, alsoViewed: viewed };
}
