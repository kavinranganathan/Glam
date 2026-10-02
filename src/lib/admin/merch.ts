import "server-only";

import { ApiError } from "@/lib/api/respond";
import { serviceClient } from "@/lib/supabase/service";
import type { Tables } from "@/lib/supabase/types";
import type { BannerInput, EditorialInput, FlashSaleInput } from "./schemas";

export type BannerRow = Tables<"banners">;
export type EditorialRow = Tables<"editorial_cards">;

// ---------------------------------------------------------------------------
// Banners
// ---------------------------------------------------------------------------

export async function listBanners(): Promise<BannerRow[]> {
  const { data, error } = await serviceClient().from("banners").select("*").order("position").order("created_at");
  if (error) throw error;
  return data;
}

export async function createBanner(input: BannerInput): Promise<BannerRow> {
  const { data, error } = await serviceClient().from("banners").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateBanner(id: string, patch: Partial<BannerInput>): Promise<BannerRow> {
  const { data, error } = await serviceClient().from("banners").update(patch).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "NOT_FOUND", "Banner not found.");
  return data;
}

export async function deleteBanner(id: string): Promise<void> {
  const { error } = await serviceClient().from("banners").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Editorial cards
// ---------------------------------------------------------------------------

export async function listEditorial(): Promise<EditorialRow[]> {
  const { data, error } = await serviceClient().from("editorial_cards").select("*").order("position").order("created_at");
  if (error) throw error;
  return data;
}

export async function createEditorial(input: EditorialInput): Promise<EditorialRow> {
  const { data, error } = await serviceClient().from("editorial_cards").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateEditorial(id: string, patch: Partial<EditorialInput>): Promise<EditorialRow> {
  const { data, error } = await serviceClient().from("editorial_cards").update(patch).eq("id", id).select("*").maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "NOT_FOUND", "Editorial card not found.");
  return data;
}

export async function deleteEditorial(id: string): Promise<void> {
  const { error } = await serviceClient().from("editorial_cards").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Flash sales
// ---------------------------------------------------------------------------

export interface FlashSaleItemView {
  productId: string;
  name: string;
  slug: string;
  image: string | null;
  price: number;
  salePrice: number;
}

export interface FlashSaleView {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  bannerUrl: string | null;
  isActive: boolean;
  createdAt: string;
  items: FlashSaleItemView[];
}

type FlashRow = Tables<"flash_sales"> & {
  flash_sale_items: Array<{
    product_id: string;
    sale_price: number;
    products: { name: string; slug: string; images: string[]; price: number } | null;
  }>;
};

const FLASH_SELECT = "*, flash_sale_items(product_id, sale_price, products(name, slug, images, price))";

function toView(r: FlashRow): FlashSaleView {
  return {
    id: r.id,
    name: r.name,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    bannerUrl: r.banner_url,
    isActive: r.is_active,
    createdAt: r.created_at,
    items: r.flash_sale_items.map((i) => ({
      productId: i.product_id,
      name: i.products?.name ?? "Unknown product",
      slug: i.products?.slug ?? "",
      image: i.products?.images[0] ?? null,
      price: i.products?.price ?? 0,
      salePrice: i.sale_price,
    })),
  };
}

export async function listFlashSales(): Promise<FlashSaleView[]> {
  const { data, error } = await serviceClient().from("flash_sales").select(FLASH_SELECT).order("starts_at", { ascending: false });
  if (error) throw error;
  return (data as FlashRow[]).map(toView);
}

export async function getFlashSale(id: string): Promise<FlashSaleView> {
  const { data, error } = await serviceClient().from("flash_sales").select(FLASH_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "NOT_FOUND", "Flash sale not found.");
  return toView(data as FlashRow);
}

function assertWindow(startsAt?: string, endsAt?: string) {
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    throw new ApiError(422, "VALIDATION", "End time must be after the start time.");
  }
}

async function replaceItems(saleId: string, items: FlashSaleInput["items"]) {
  const db = serviceClient();
  const { error: delError } = await db.from("flash_sale_items").delete().eq("flash_sale_id", saleId);
  if (delError) throw delError;
  if (!items.length) return;
  const seen = new Set<string>();
  const rows = items
    .filter((i) => (seen.has(i.product_id) ? false : seen.add(i.product_id)))
    .map((i) => ({ flash_sale_id: saleId, product_id: i.product_id, sale_price: i.sale_price }));
  const { error } = await db.from("flash_sale_items").insert(rows);
  if (error) throw error;
}

export async function createFlashSale(input: FlashSaleInput): Promise<FlashSaleView> {
  assertWindow(input.starts_at, input.ends_at);
  const { items, ...sale } = input;
  const { data, error } = await serviceClient().from("flash_sales").insert(sale).select("id").single();
  if (error) throw error;
  await replaceItems(data.id, items);
  return getFlashSale(data.id);
}

export async function updateFlashSale(id: string, patch: Partial<FlashSaleInput>): Promise<FlashSaleView> {
  const existing = await getFlashSale(id);
  assertWindow(patch.starts_at ?? existing.startsAt, patch.ends_at ?? existing.endsAt);
  const { items, ...sale } = patch;
  if (Object.keys(sale).length) {
    const { error } = await serviceClient().from("flash_sales").update(sale).eq("id", id);
    if (error) throw error;
  }
  if (items) await replaceItems(id, items);
  return getFlashSale(id);
}

export async function deleteFlashSale(id: string): Promise<void> {
  const { error } = await serviceClient().from("flash_sales").delete().eq("id", id);
  if (error) throw error;
}
