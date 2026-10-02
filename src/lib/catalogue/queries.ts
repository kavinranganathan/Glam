import "server-only";

import { cache } from "react";
import { serviceClient } from "@/lib/supabase/service";
import type { Json, Tables } from "@/lib/supabase/types.generated";
import { discountPercent } from "@/lib/utils/money";
import {
  CARD_SELECT,
  DETAIL_SELECT,
  toProductCard,
  toProductDetail,
  type CardRow,
  type DetailRow,
} from "./mappers";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./search";
import type {
  BannerView,
  BrandView,
  CategoryNode,
  EditorialView,
  FacetOption,
  Facets,
  FlashSaleView,
  ListFilters,
  ListResult,
  ProductCard,
  ProductDetail,
  SortKey,
} from "./types";

/** Upper bound on rows scanned for facets / in-memory filtering. */
const SCAN_LIMIT = 1000;
/** Up to this many tier-1 brand results on a search page are flagged `sponsored`. */
const SPONSORED_SLOTS = 2;

export const FALLBACK_TRENDING = ["vitamin c serum", "sunscreen", "matte lipstick", "kurta set", "hair oil"];

// ---------------------------------------------------------------------------
// Flash sale
// ---------------------------------------------------------------------------

export interface ActiveFlashSale {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  bannerUrl: string | null;
  /** product id -> sale price (paise) */
  prices: Map<string, number>;
}

export const getActiveFlashSale = cache(async (): Promise<ActiveFlashSale | null> => {
  const now = new Date().toISOString();
  const { data, error } = await serviceClient()
    .from("flash_sales")
    .select("id,name,starts_at,ends_at,banner_url, items:flash_sale_items(product_id,sale_price)")
    .eq("is_active", true)
    .lte("starts_at", now)
    .gte("ends_at", now)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    bannerUrl: data.banner_url,
    prices: new Map(data.items.map((i) => [i.product_id, i.sale_price] as const)),
  };
});

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

interface CategoryIndex {
  roots: CategoryNode[];
  byId: Map<string, CategoryNode>;
  bySlug: Map<string, CategoryNode>;
  parentOf: Map<string, string | null>;
}

function toNode(c: Tables<"categories">): CategoryNode {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    imageUrl: c.image_url,
    root: c.root,
    returnWindowDays: c.return_window_days,
    children: [],
  };
}

const categoryIndex = cache(async (): Promise<CategoryIndex> => {
  const { data, error } = await serviceClient().from("categories").select("*").order("position").order("name");
  if (error) throw error;
  const byId = new Map<string, CategoryNode>();
  const bySlug = new Map<string, CategoryNode>();
  const parentOf = new Map<string, string | null>();
  for (const c of data) {
    const node = toNode(c);
    byId.set(node.id, node);
    bySlug.set(node.slug, node);
    parentOf.set(node.id, c.parent_id);
  }
  const roots: CategoryNode[] = [];
  for (const c of data) {
    const node = byId.get(c.id)!;
    const parent = c.parent_id ? byId.get(c.parent_id) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return { roots, byId, bySlug, parentOf };
});

/** Root categories with nested children, in `position` order. Memoised per request. */
export const getCategoryTree = cache(async (): Promise<CategoryNode[]> => (await categoryIndex()).roots);

/** `path` is in breadcrumb order: root first, ending with `node`. */
export async function getCategoryBySlug(slug: string): Promise<{ node: CategoryNode; path: CategoryNode[] } | null> {
  const idx = await categoryIndex();
  const node = idx.bySlug.get(slug);
  if (!node) return null;
  return { node, path: ancestry(idx, node.id).reverse() };
}

/** Leaf first, root last. */
function ancestry(idx: CategoryIndex, leafId: string): CategoryNode[] {
  const out: CategoryNode[] = [];
  let cur: string | null | undefined = leafId;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const node = idx.byId.get(cur);
    if (!node) break;
    out.push(node);
    cur = idx.parentOf.get(cur);
  }
  return out;
}

function descendantIds(node: CategoryNode): string[] {
  const out: string[] = [];
  const stack = [node];
  while (stack.length) {
    const n = stack.pop()!;
    out.push(n.id);
    stack.push(...n.children);
  }
  return out;
}

/** Ids of `slug` and every descendant category, or null when the slug is unknown. */
export async function categoryScopeIds(slug: string): Promise<string[] | null> {
  const node = (await categoryIndex()).bySlug.get(slug);
  return node ? descendantIds(node) : null;
}

/** The top-level ancestor of a category id (itself when already a root). */
export async function topLevelCategoryOf(categoryId: string): Promise<CategoryNode | null> {
  const idx = await categoryIndex();
  const chain = ancestry(idx, categoryId);
  return chain[chain.length - 1] ?? null;
}

/** Sibling categories (same parent) of a category id, excluding itself. */
export async function siblingCategories(categoryId: string): Promise<CategoryNode[]> {
  const idx = await categoryIndex();
  const parentId = idx.parentOf.get(categoryId);
  const pool = parentId ? (idx.byId.get(parentId)?.children ?? []) : (idx.byId.get(categoryId)?.children ?? []);
  return pool.filter((c) => c.id !== categoryId);
}

// ---------------------------------------------------------------------------
// Brands
// ---------------------------------------------------------------------------

function socialsOf(json: Json): Record<string, string> {
  if (!json || typeof json !== "object" || Array.isArray(json)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(json)) if (typeof v === "string") out[k] = v;
  return out;
}

function toBrandView(b: Tables<"brands">): BrandView {
  return {
    id: b.id,
    slug: b.slug,
    name: b.name,
    logoUrl: b.logo_url,
    coverUrl: b.cover_url,
    tagline: b.tagline,
    about: b.about,
    verified: b.verified,
    tier: b.tier,
    socials: socialsOf(b.socials),
    certifications: b.certifications,
    followerCount: b.follower_count,
  };
}

export const listBrands = cache(async (): Promise<BrandView[]> => {
  const { data, error } = await serviceClient().from("brands").select("*").order("name");
  if (error) throw error;
  return data.map(toBrandView);
});

const brandIndex = cache(async () => {
  const all = await listBrands();
  return {
    byId: new Map(all.map((b) => [b.id, b] as const)),
    bySlug: new Map(all.map((b) => [b.slug, b] as const)),
  };
});

export async function getBrand(slug: string): Promise<BrandView | null> {
  return (await brandIndex()).bySlug.get(slug) ?? null;
}

// ---------------------------------------------------------------------------
// Product cards
// ---------------------------------------------------------------------------

interface CardBuildOptions {
  /** Flag up to `SPONSORED_SLOTS` tier-1 brand products as sponsored. */
  sponsoredSlots?: number;
}

async function rowsToCards(rows: CardRow[], opts: CardBuildOptions = {}): Promise<ProductCard[]> {
  const flash = await getActiveFlashSale();
  const now = new Date();
  let slots = opts.sponsoredSlots ?? 0;
  return rows.map((row) => {
    const sponsored = slots > 0 && row.brand?.tier === 1;
    if (sponsored) slots -= 1;
    return toProductCard(row, { flashPrices: flash?.prices, now, sponsored });
  });
}

/** Active products for the given ids, in the same order as `ids` (unknown ids are skipped). */
export async function getProductsByIds(ids: string[]): Promise<ProductCard[]> {
  const unique = [...new Set(ids)];
  if (!unique.length) return [];
  const { data, error } = await serviceClient().from("products").select(CARD_SELECT).in("id", unique).eq("is_active", true);
  if (error) throw error;
  const byId = new Map((data as CardRow[]).map((r) => [r.id, r] as const));
  const ordered = unique.map((id) => byId.get(id)).filter((r): r is CardRow => Boolean(r));
  return rowsToCards(ordered);
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const { data, error } = await serviceClient()
    .from("products")
    .select(DETAIL_SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as DetailRow;
  const [idx, flash] = await Promise.all([categoryIndex(), getActiveFlashSale()]);
  return toProductDetail(row, ancestry(idx, row.category_id), { flashPrices: flash?.prices });
}

export async function getProductIdBySlug(slug: string): Promise<string | null> {
  const { data, error } = await serviceClient().from("products").select("id").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

// ---------------------------------------------------------------------------
// Listing: filters, sorting, facets
// ---------------------------------------------------------------------------

type OfferKind = NonNullable<ListFilters["offer"]>[number];

/** Resolved, DB-expressible filter scope shared by the facet scan and the page query. */
interface Scope {
  f: ListFilters;
  categoryIds: string[] | null;
  brandIds: string[] | null;
  flashIds: string[];
  search: { kind: "none" } | { kind: "fts"; q: string } | { kind: "fallback"; q: string; brandIds: string[] };
}

const LIGHT_SELECT =
  "id,brand_id,category_id,skin_types,concerns,free_from,finish,price,mrp,sold_count,rating_avg,launched_at,offer_type, stk:variants!inner(id)" as const;

type LightRow = Pick<
  Tables<"products">,
  | "id"
  | "brand_id"
  | "category_id"
  | "skin_types"
  | "concerns"
  | "free_from"
  | "finish"
  | "price"
  | "mrp"
  | "sold_count"
  | "rating_avg"
  | "launched_at"
  | "offer_type"
>;

function sanitizeForOr(s: string): string {
  return s.replace(/[,()"'\\]/g, " ").replace(/\s+/g, " ").trim();
}

/** Builds a products query with every filter PostgREST can express. */
function baseQuery<S extends string>(select: S, scope: Scope, count?: "exact") {
  const { f } = scope;
  let q = serviceClient()
    .from("products")
    .select(select, count ? { count } : undefined)
    .eq("is_active", true);

  if (scope.categoryIds) q = q.in("category_id", scope.categoryIds);
  if (scope.brandIds) q = q.in("brand_id", scope.brandIds);
  if (f.priceMin !== undefined) q = q.gte("price", f.priceMin);
  if (f.priceMax !== undefined) q = q.lte("price", f.priceMax);
  if (f.rating !== undefined) q = q.gte("rating_avg", f.rating);
  if (f.skinTypes?.length) q = q.overlaps("skin_types", f.skinTypes);
  if (f.concerns?.length) q = q.overlaps("concerns", f.concerns);
  if (f.freeFrom?.length) q = q.overlaps("free_from", f.freeFrom);
  if (f.finish?.length) q = q.in("finish", f.finish);
  if (f.inStock) q = q.gt("stk.stock", 0);
  if (f.sizes?.length) q = q.eq("stk.kind", "size").in("stk.name", f.sizes);

  // Offers without `on_sale` can be expressed as an OR; `on_sale` (price < mrp) is applied in memory.
  const offer = f.offer ?? [];
  if (offer.length && !offer.includes("on_sale")) {
    const parts: string[] = [];
    if (offer.includes("bxgy")) parts.push("offer_type.eq.bxgy");
    if (offer.includes("flash")) parts.push(scope.flashIds.length ? `id.in.(${scope.flashIds.join(",")})` : "id.is.null");
    q = q.or(parts.join(","));
  }

  if (scope.search.kind === "fts") {
    q = q.textSearch("search", scope.search.q, { type: "websearch", config: "english" });
  } else if (scope.search.kind === "fallback") {
    const pattern = `%${sanitizeForOr(scope.search.q)}%`;
    q = scope.search.brandIds.length
      ? q.or(`name.ilike.${pattern},brand_id.in.(${scope.search.brandIds.join(",")})`)
      : q.ilike("name", pattern);
  }
  return q;
}

function needsMemoryPass(f: ListFilters): boolean {
  return f.discount !== undefined || Boolean(f.offer?.includes("on_sale")) || f.sort === "discount";
}

function effectivePrice(row: Pick<LightRow, "id" | "price">, flash: ActiveFlashSale | null): number {
  return flash?.prices.get(row.id) ?? row.price;
}

function memoryPredicate(f: ListFilters, flash: ActiveFlashSale | null): (row: LightRow) => boolean {
  const offer = new Set<OfferKind>(f.offer ?? []);
  const offerInMemory = offer.has("on_sale");
  return (row) => {
    const price = effectivePrice(row, flash);
    if (f.discount !== undefined && discountPercent(row.mrp, price) < f.discount) return false;
    if (offerInMemory) {
      const onSale = price < row.mrp;
      const bxgy = offer.has("bxgy") && row.offer_type === "bxgy";
      const inFlash = offer.has("flash") && Boolean(flash?.prices.has(row.id));
      if (!onSale && !bxgy && !inFlash) return false;
    }
    return true;
  };
}

function memoryComparator(sort: SortKey, flash: ActiveFlashSale | null): (a: LightRow, b: LightRow) => number {
  const tie = (a: LightRow, b: LightRow) => a.id.localeCompare(b.id);
  switch (sort) {
    case "price_asc":
      return (a, b) => effectivePrice(a, flash) - effectivePrice(b, flash) || tie(a, b);
    case "price_desc":
      return (a, b) => effectivePrice(b, flash) - effectivePrice(a, flash) || tie(a, b);
    case "discount":
      return (a, b) =>
        discountPercent(b.mrp, effectivePrice(b, flash)) - discountPercent(a.mrp, effectivePrice(a, flash)) ||
        b.sold_count - a.sold_count ||
        tie(a, b);
    case "rating":
      return (a, b) => Number(b.rating_avg) - Number(a.rating_avg) || b.sold_count - a.sold_count || tie(a, b);
    case "newest":
      return (a, b) => b.launched_at.localeCompare(a.launched_at) || tie(a, b);
    case "relevance":
    case "popularity":
    default:
      return (a, b) => b.sold_count - a.sold_count || tie(a, b);
  }
}

function applyDbOrder<Q extends { order: (col: string, o?: { ascending?: boolean }) => Q }>(q: Q, sort: SortKey): Q {
  switch (sort) {
    case "price_asc":
      return q.order("price", { ascending: true }).order("id");
    case "price_desc":
      return q.order("price", { ascending: false }).order("id");
    case "rating":
      return q.order("rating_avg", { ascending: false }).order("rating_count", { ascending: false }).order("id");
    case "newest":
      return q.order("launched_at", { ascending: false }).order("id");
    case "relevance":
    case "popularity":
    case "discount":
    default:
      // relevance: ts_rank is not reachable through PostgREST, so popularity stands in.
      return q.order("sold_count", { ascending: false }).order("id");
  }
}

function countValues(rows: LightRow[], pick: (r: LightRow) => string[]): FacetOption[] {
  const counts = new Map<string, number>();
  for (const r of rows) for (const v of new Set(pick(r))) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

const APPAREL_ORDER = ["xxs", "xs", "s", "m", "l", "xl", "xxl", "xxxl", "free size", "one size"];
function sizeRank(label: string): [number, number, string] {
  const l = label.trim().toLowerCase();
  const apparel = APPAREL_ORDER.indexOf(l);
  if (apparel >= 0) return [0, apparel, l];
  const num = parseFloat(l);
  if (Number.isFinite(num)) return [1, num, l];
  return [2, 0, l];
}
function compareSizes(a: FacetOption, b: FacetOption): number {
  const [ga, na, la] = sizeRank(a.label);
  const [gb, nb, lb] = sizeRank(b.label);
  return ga - gb || na - nb || la.localeCompare(lb);
}

/** Largest id list we are willing to put in a PostgREST `in()` filter (URL length). */
const MAX_IN_LIST = 300;

/**
 * Size options from `kind = 'size'` variants. Scoped to the matched products when the match set
 * is small enough for an `in()` list, else to the category subtree, else the whole catalogue.
 */
async function sizeFacet(categoryIds: string[] | null, matchedIds: string[]): Promise<FacetOption[]> {
  let q = serviceClient()
    .from("variants")
    .select("name, product:products!inner(id,category_id,is_active)")
    .eq("kind", "size")
    .eq("product.is_active", true)
    .limit(SCAN_LIMIT);
  if (matchedIds.length <= MAX_IN_LIST) q = q.in("product_id", matchedIds);
  else if (categoryIds) q = q.in("product.category_id", categoryIds);
  const { data, error } = await q;
  if (error) throw error;
  const counts = new Map<string, Set<string>>();
  for (const v of data) {
    const set = counts.get(v.name) ?? new Set<string>();
    set.add(v.product.id);
    counts.set(v.name, set);
  }
  return [...counts.entries()].map(([value, set]) => ({ value, label: value, count: set.size })).sort(compareSizes);
}

function emptyFacets(): Facets {
  return { brands: [], skinTypes: [], concerns: [], freeFrom: [], finish: [], sizes: [], priceRange: { min: 0, max: 0 } };
}

async function buildFacets(rows: LightRow[], categoryIds: string[] | null, flash: ActiveFlashSale | null): Promise<Facets> {
  if (!rows.length) return emptyFacets();
  const [brands, sizes] = await Promise.all([
    brandIndex(),
    sizeFacet(
      categoryIds,
      rows.map((r) => r.id),
    ),
  ]);
  const brandFacet = countValues(rows, (r) => [r.brand_id])
    .map((o) => {
      const b = brands.byId.get(o.value);
      return b ? { value: b.slug, label: b.name, count: o.count } : null;
    })
    .filter((o): o is FacetOption => o !== null)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  for (const r of rows) {
    const p = effectivePrice(r, flash);
    if (p < min) min = p;
    if (p > max) max = p;
  }
  return {
    brands: brandFacet,
    skinTypes: countValues(rows, (r) => r.skin_types),
    concerns: countValues(rows, (r) => r.concerns),
    freeFrom: countValues(rows, (r) => r.free_from),
    finish: countValues(rows, (r) => (r.finish ? [r.finish] : [])),
    sizes,
    priceRange: rows.length ? { min, max } : { min: 0, max: 0 },
  };
}

async function isServiceable(pincode: string, delivery: ListFilters["delivery"]): Promise<boolean> {
  if (!delivery || delivery === "standard") return true;
  const { data, error } = await serviceClient().from("pincodes").select("same_day,next_day").eq("pincode", pincode).maybeSingle();
  if (error) throw error;
  if (!data) return false;
  return delivery === "same_day" ? data.same_day : data.next_day;
}

async function fetchLight(scope: Scope): Promise<LightRow[]> {
  const { data, error } = await baseQuery(LIGHT_SELECT, scope).limit(SCAN_LIMIT);
  if (error) throw error;
  return data as LightRow[];
}

/**
 * Product listing for PLP / search / brand pages.
 *
 * Applied in Postgres: active, category subtree, brands, price bounds, rating, array facets
 * (`overlaps`), finish, in-stock and size (inner join on variants), bxgy / flash offers, full-text
 * search (`websearch`) with an ilike name-or-brand fallback when FTS finds nothing.
 *
 * Applied in memory over at most `SCAN_LIMIT` matching rows: `discount` (needs mrp vs price),
 * `offer=on_sale` (price < mrp) and the `discount` sort. Totals stay correct because the
 * in-memory pass sees every matching row before paginating.
 */
export async function listProducts(f: ListFilters): Promise<ListResult> {
  const page = Math.max(1, Math.floor(f.page ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(f.pageSize ?? DEFAULT_PAGE_SIZE)));
  const sort: SortKey = f.sort ?? "relevance";
  const base: ListResult = { items: [], total: 0, page, pageSize, facets: emptyFacets() };

  const [flash, brands, categoryIds] = await Promise.all([
    getActiveFlashSale(),
    brandIndex(),
    f.category ? categoryScopeIds(f.category) : Promise.resolve(null),
  ]);
  if (f.category && !categoryIds) return base;

  let brandIds: string[] | null = null;
  if (f.brands?.length) {
    brandIds = f.brands.map((s) => brands.bySlug.get(s)?.id).filter((id): id is string => Boolean(id));
    if (!brandIds.length) return base;
  }

  const q = f.q?.trim();
  const scope: Scope = {
    f,
    categoryIds,
    brandIds,
    flashIds: flash ? [...flash.prices.keys()] : [],
    search: q ? { kind: "fts", q } : { kind: "none" },
  };

  let light = await fetchLight(scope);
  if (q && light.length === 0) {
    const safe = sanitizeForOr(q);
    const { data: hits, error } = await serviceClient().from("brands").select("id").ilike("name", `%${safe}%`);
    if (error) throw error;
    scope.search = { kind: "fallback", q, brandIds: hits.map((b) => b.id) };
    light = await fetchLight(scope);
  }

  const matched = light.filter(memoryPredicate(f, flash));
  const sponsoredSlots = q && page === 1 ? SPONSORED_SLOTS : 0;
  const from = (page - 1) * pageSize;

  const loadPage = async (): Promise<{ items: ProductCard[]; total: number }> => {
    if (!matched.length) return { items: [], total: 0 };
    if (needsMemoryPass(f)) {
      // Filters PostgREST cannot express: sort and page in memory over the scanned rows.
      const ordered = [...matched].sort(memoryComparator(sort, flash));
      const ids = ordered.slice(from, from + pageSize).map((r) => r.id);
      const cards = await getProductsByIds(ids);
      return { items: markSponsored(cards, sponsoredSlots, brands.byId), total: ordered.length };
    }
    // Let Postgres sort, count and page.
    const paged = applyDbOrder(baseQuery(CARD_SELECT, scope, "exact"), sort).range(from, from + pageSize - 1);
    const { data, error, count } = await paged;
    if (error) throw error;
    const cards = await rowsToCards(data as CardRow[], { sponsoredSlots });
    return { items: cards, total: count ?? cards.length };
  };

  const [facets, serviceable, pageResult] = await Promise.all([
    buildFacets(matched, categoryIds, flash),
    f.pincode ? isServiceable(f.pincode, f.delivery) : Promise.resolve(true),
    loadPage(),
  ]);

  // Unserviceable pincode for the requested speed: keep facets, show no products.
  if (!serviceable) return { ...base, facets };
  return { ...base, facets, ...pageResult };
}

function markSponsored(cards: ProductCard[], slots: number, brandsById: Map<string, BrandView>): ProductCard[] {
  if (!slots) return cards;
  let left = slots;
  return cards.map((c) => {
    if (left > 0 && brandsById.get(c.brand.id)?.tier === 1 && !c.badges.includes("sponsored")) {
      left -= 1;
      return { ...c, badges: [...c.badges, "sponsored"] };
    }
    return c;
  });
}

// ---------------------------------------------------------------------------
// Merchandising
// ---------------------------------------------------------------------------

export async function getBanners(): Promise<BannerView[]> {
  const now = new Date().toISOString();
  const { data, error } = await serviceClient()
    .from("banners")
    .select("*")
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("position");
  if (error) throw error;
  return data.map((b) => ({
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    imageUrl: b.image_url,
    ctaLabel: b.cta_label,
    href: b.href,
  }));
}

export async function getEditorialCards(): Promise<EditorialView[]> {
  const { data, error } = await serviceClient().from("editorial_cards").select("*").eq("is_active", true).order("position");
  if (error) throw error;
  return data.map((c) => ({ id: c.id, title: c.title, excerpt: c.excerpt, imageUrl: c.image_url, href: c.href }));
}

export async function getFlashSaleView(): Promise<FlashSaleView | null> {
  const flash = await getActiveFlashSale();
  if (!flash) return null;
  const items = await getProductsByIds([...flash.prices.keys()]);
  return { id: flash.id, name: flash.name, startsAt: flash.startsAt, endsAt: flash.endsAt, bannerUrl: flash.bannerUrl, items };
}

// ---------------------------------------------------------------------------
// Search helpers
// ---------------------------------------------------------------------------

export function normaliseQuery(q: string): string {
  return q.trim().replace(/\s+/g, " ");
}

/** Most frequent queries over the last 7 days, padded with a static list to at least 5 entries. */
export async function getTrendingSearches(limit = 8): Promise<string[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await serviceClient()
    .from("search_history")
    .select("query")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const r of data) {
    const key = normaliseQuery(r.query).toLowerCase();
    if (key.length < 2) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([q]) => q);
  for (const fallback of FALLBACK_TRENDING) {
    if (top.length >= Math.max(5, Math.min(limit, 5))) break;
    if (!top.includes(fallback)) top.push(fallback);
  }
  return top.slice(0, limit);
}

export interface SuggestResult {
  products: Array<{ slug: string; name: string; image: string; brand: string }>;
  brands: Array<{ slug: string; name: string }>;
  categories: Array<{ slug: string; name: string }>;
}

export async function suggest(q: string): Promise<SuggestResult> {
  const term = normaliseQuery(q);
  if (term.length < 2) return { products: [], brands: [], categories: [] };
  const pattern = `%${term.replace(/[%_]/g, (m) => `\\${m}`)}%`;
  const sb = serviceClient();
  const [products, brands, categories] = await Promise.all([
    sb
      .from("products")
      .select("slug,name,images,brand:brands(name)")
      .eq("is_active", true)
      .ilike("name", pattern)
      .order("sold_count", { ascending: false })
      .limit(5),
    sb.from("brands").select("slug,name").ilike("name", pattern).order("tier").order("name").limit(3),
    sb.from("categories").select("slug,name").ilike("name", pattern).order("position").limit(3),
  ]);
  if (products.error) throw products.error;
  if (brands.error) throw brands.error;
  if (categories.error) throw categories.error;
  return {
    products: products.data.map((p) => ({ slug: p.slug, name: p.name, image: p.images[0] ?? "", brand: p.brand?.name ?? "" })),
    brands: brands.data,
    categories: categories.data,
  };
}
