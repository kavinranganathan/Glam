import type { ListFilters } from "@/lib/catalogue/types";
import { filtersToSearchParams } from "@/lib/catalogue/search";

/** Next.js page `searchParams` record -> URLSearchParams (repeats arrays as multiple keys). */
export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export function toURLSearchParams(record: SearchParamsRecord): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) value.forEach((v) => sp.append(key, v));
    else sp.append(key, value);
  }
  return sp;
}

/** Stable string identity for a filter set, used to remount lists when filters change. */
export function filtersKey(f: ListFilters): string {
  return filtersToSearchParams({ ...f, page: 1 }).toString();
}

export const SORT_OPTIONS: Array<{ value: NonNullable<ListFilters["sort"]>; label: string }> = [
  { value: "relevance", label: "Relevance" },
  { value: "popularity", label: "Popularity" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "discount", label: "Discount" },
  { value: "rating", label: "Customer Rating" },
  { value: "newest", label: "Newest First" },
];

export function formatCount(n: number): string {
  return n.toLocaleString("en-IN");
}
