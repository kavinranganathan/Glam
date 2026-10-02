/**
 * URL <-> ListFilters conversion for PLP / search pages. Pure: no I/O.
 *
 * Query keys: q, category, brand, price_min, price_max (rupees), discount, rating,
 * skin, concern, free_from, finish, size, in_stock, delivery, offer, sort, page, page_size, pincode.
 * Multi-value keys accept repeats (`brand=a&brand=b`) or comma lists (`brand=a,b`).
 */
import type { ListFilters, SortKey } from "./types";

export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 48;
export const DEFAULT_SORT: SortKey = "relevance";

const SORT_KEYS: readonly SortKey[] = ["relevance", "popularity", "price_asc", "price_desc", "discount", "rating", "newest"];
const DISCOUNT_STEPS = [10, 20, 30, 50, 70] as const;
const RATING_STEPS = [3, 4] as const;
const DELIVERY_VALUES = ["same_day", "next_day", "standard"] as const;
const OFFER_VALUES = ["on_sale", "bxgy", "flash"] as const;

type Delivery = NonNullable<ListFilters["delivery"]>;
type Offer = NonNullable<ListFilters["offer"]>[number];

function multi(sp: URLSearchParams, key: string): string[] | undefined {
  const out: string[] = [];
  for (const raw of sp.getAll(key)) {
    for (const part of raw.split(",")) {
      const v = part.trim();
      if (v && !out.includes(v)) out.push(v);
    }
  }
  return out.length ? out : undefined;
}

function text(sp: URLSearchParams, key: string): string | undefined {
  const v = sp.get(key)?.trim();
  return v ? v : undefined;
}

function num(sp: URLSearchParams, key: string): number | undefined {
  const raw = sp.get(key);
  if (raw == null || raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export function parseListFilters(searchParams: URLSearchParams): ListFilters {
  const f: ListFilters = {};

  const q = text(searchParams, "q");
  if (q) f.q = q;
  const category = text(searchParams, "category");
  if (category) f.category = category;
  const brands = multi(searchParams, "brand");
  if (brands) f.brands = brands;

  const priceMin = num(searchParams, "price_min");
  if (priceMin !== undefined && priceMin >= 0) f.priceMin = Math.round(priceMin * 100);
  const priceMax = num(searchParams, "price_max");
  if (priceMax !== undefined && priceMax >= 0) f.priceMax = Math.round(priceMax * 100);
  if (f.priceMin !== undefined && f.priceMax !== undefined && f.priceMin > f.priceMax) {
    const t = f.priceMin;
    f.priceMin = f.priceMax;
    f.priceMax = t;
  }

  const discount = num(searchParams, "discount");
  if (discount !== undefined && (DISCOUNT_STEPS as readonly number[]).includes(discount)) f.discount = discount;
  const rating = num(searchParams, "rating");
  if (rating !== undefined && (RATING_STEPS as readonly number[]).includes(rating)) f.rating = rating;

  const skinTypes = multi(searchParams, "skin");
  if (skinTypes) f.skinTypes = skinTypes;
  const concerns = multi(searchParams, "concern");
  if (concerns) f.concerns = concerns;
  const freeFrom = multi(searchParams, "free_from");
  if (freeFrom) f.freeFrom = freeFrom;
  const finish = multi(searchParams, "finish");
  if (finish) f.finish = finish;
  const sizes = multi(searchParams, "size");
  if (sizes) f.sizes = sizes;

  const inStock = searchParams.get("in_stock");
  if (inStock === "1" || inStock === "true") f.inStock = true;

  const delivery = oneOf<Delivery>(text(searchParams, "delivery"), DELIVERY_VALUES);
  if (delivery) f.delivery = delivery;

  const offerRaw = multi(searchParams, "offer");
  if (offerRaw) {
    const offer = offerRaw.filter((o): o is Offer => (OFFER_VALUES as readonly string[]).includes(o));
    if (offer.length) f.offer = offer;
  }

  f.sort = oneOf<SortKey>(text(searchParams, "sort"), SORT_KEYS) ?? DEFAULT_SORT;

  const page = num(searchParams, "page");
  f.page = page !== undefined && page >= 1 ? Math.floor(page) : 1;
  const pageSize = num(searchParams, "page_size");
  f.pageSize =
    pageSize !== undefined && pageSize >= 1 ? Math.min(MAX_PAGE_SIZE, Math.floor(pageSize)) : DEFAULT_PAGE_SIZE;

  const pincode = text(searchParams, "pincode");
  if (pincode) f.pincode = pincode;

  return f;
}

/** Inverse of `parseListFilters`. Defaults (page 1, page_size 24, sort relevance) are omitted. */
export function filtersToSearchParams(f: ListFilters): URLSearchParams {
  const sp = new URLSearchParams();
  const setList = (key: string, values: string[] | undefined) => {
    for (const v of values ?? []) sp.append(key, v);
  };

  if (f.q) sp.set("q", f.q);
  if (f.category) sp.set("category", f.category);
  setList("brand", f.brands);
  if (f.priceMin !== undefined) sp.set("price_min", String(f.priceMin / 100));
  if (f.priceMax !== undefined) sp.set("price_max", String(f.priceMax / 100));
  if (f.discount !== undefined) sp.set("discount", String(f.discount));
  if (f.rating !== undefined) sp.set("rating", String(f.rating));
  setList("skin", f.skinTypes);
  setList("concern", f.concerns);
  setList("free_from", f.freeFrom);
  setList("finish", f.finish);
  setList("size", f.sizes);
  if (f.inStock) sp.set("in_stock", "1");
  if (f.delivery) sp.set("delivery", f.delivery);
  setList("offer", f.offer);
  if (f.sort && f.sort !== DEFAULT_SORT) sp.set("sort", f.sort);
  if (f.page && f.page > 1) sp.set("page", String(f.page));
  if (f.pageSize && f.pageSize !== DEFAULT_PAGE_SIZE) sp.set("page_size", String(Math.min(MAX_PAGE_SIZE, f.pageSize)));
  if (f.pincode) sp.set("pincode", f.pincode);
  return sp;
}

/**
 * Number of active refinements for the filter-sheet badge. Each selected value in a
 * multi-select counts once; price range counts once; q/category/sort/page/pageSize/pincode are excluded.
 */
export function activeFilterCount(f: ListFilters): number {
  let n = 0;
  n += f.brands?.length ?? 0;
  if (f.priceMin !== undefined || f.priceMax !== undefined) n += 1;
  if (f.discount !== undefined) n += 1;
  if (f.rating !== undefined) n += 1;
  n += f.skinTypes?.length ?? 0;
  n += f.concerns?.length ?? 0;
  n += f.freeFrom?.length ?? 0;
  n += f.finish?.length ?? 0;
  n += f.sizes?.length ?? 0;
  if (f.inStock) n += 1;
  if (f.delivery && f.delivery !== "standard") n += 1;
  n += f.offer?.length ?? 0;
  return n;
}
