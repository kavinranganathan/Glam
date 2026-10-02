import "server-only";

import { ApiError } from "@/lib/api/respond";
import { serviceClient } from "@/lib/supabase/service";
import type { Tables } from "@/lib/supabase/types";
import { maskName } from "@/lib/utils/mask";
import { isBackInStock, isPriceDrop, pickDefaultVariant, wishlistInStock } from "./rules";
import type { WishlistCollectionView, WishlistItemView } from "./types";

const DEFAULT_COLLECTION_NAME = "My Wishlist";
const MAX_COLLECTION_NAME = 40;

const ITEM_SELECT = `id, collection_id, product_id, variant_id, price_at_add, created_at,
  products!inner(id, slug, name, images, price, mrp, is_active,
    brands(name),
    variants(id, stock, is_default))` as const;

type ItemRow = Tables<"wishlist_items"> & {
  products: Pick<Tables<"products">, "id" | "slug" | "name" | "images" | "price" | "mrp" | "is_active"> & {
    brands: { name: string } | null;
    variants: Array<Pick<Tables<"variants">, "id" | "stock" | "is_default">>;
  };
};

/* ------------------------------------------------------------------------------------------------
 * Collections
 * ---------------------------------------------------------------------------------------------- */

async function ensureDefaultCollection(userId: string): Promise<Tables<"wishlist_collections">> {
  const db = serviceClient();
  const { data: existing } = await db
    .from("wishlist_collections")
    .select("*")
    .eq("user_id", userId)
    .eq("is_default", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing) return existing;
  const { data, error } = await db.from("wishlist_collections").insert({ user_id: userId, name: DEFAULT_COLLECTION_NAME, is_default: true }).select("*").single();
  if (error || !data) throw new ApiError(500, "WISHLIST_UNAVAILABLE", "Could not open your wishlist. Please try again.");
  return data;
}

async function ownedCollection(userId: string, collectionId: string): Promise<Tables<"wishlist_collections">> {
  const { data } = await serviceClient().from("wishlist_collections").select("*").eq("id", collectionId).eq("user_id", userId).maybeSingle();
  if (!data) throw new ApiError(404, "COLLECTION_NOT_FOUND", "Collection not found.");
  return data;
}

function sortCollections<T extends { is_default: boolean; created_at: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.created_at.localeCompare(b.created_at));
}

async function collectionViews(rows: Tables<"wishlist_collections">[]): Promise<WishlistCollectionView[]> {
  if (rows.length === 0) return [];
  const { data: items } = await serviceClient()
    .from("wishlist_items")
    .select("collection_id, created_at, products!inner(images)")
    .in(
      "collection_id",
      rows.map((r) => r.id),
    )
    .order("created_at", { ascending: false });
  const counts = new Map<string, number>();
  const covers = new Map<string, string>();
  for (const it of items ?? []) {
    counts.set(it.collection_id, (counts.get(it.collection_id) ?? 0) + 1);
    const img = it.products.images[0];
    if (img && !covers.has(it.collection_id)) covers.set(it.collection_id, img);
  }
  return sortCollections(rows).map((r) => ({
    id: r.id,
    name: r.name,
    isDefault: r.is_default,
    shareToken: r.share_token,
    itemCount: counts.get(r.id) ?? 0,
    cover: covers.get(r.id) ?? null,
  }));
}

export async function getCollections(userId: string): Promise<WishlistCollectionView[]> {
  await ensureDefaultCollection(userId);
  const { data } = await serviceClient().from("wishlist_collections").select("*").eq("user_id", userId);
  return collectionViews(data ?? []);
}

export async function createCollection(userId: string, name: string): Promise<WishlistCollectionView> {
  const clean = cleanName(name);
  const { data, error } = await serviceClient().from("wishlist_collections").insert({ user_id: userId, name: clean, is_default: false }).select("*").single();
  if (error || !data) throw new ApiError(500, "WISHLIST_UNAVAILABLE", "Could not create the collection. Please try again.");
  return { id: data.id, name: data.name, isDefault: false, shareToken: data.share_token, itemCount: 0, cover: null };
}

export async function renameCollection(userId: string, collectionId: string, name: string): Promise<WishlistCollectionView> {
  const col = await ownedCollection(userId, collectionId);
  const clean = cleanName(name);
  const { data, error } = await serviceClient().from("wishlist_collections").update({ name: clean }).eq("id", col.id).select("*").single();
  if (error || !data) throw new ApiError(500, "WISHLIST_UNAVAILABLE", "Could not rename the collection. Please try again.");
  const [view] = await collectionViews([data]);
  return view;
}

/** Deletes a named collection and its items. The default collection cannot be deleted. */
export async function deleteCollection(userId: string, collectionId: string): Promise<void> {
  const col = await ownedCollection(userId, collectionId);
  if (col.is_default) throw new ApiError(409, "DEFAULT_COLLECTION", "Your default wishlist cannot be deleted.");
  const { error } = await serviceClient().from("wishlist_collections").delete().eq("id", col.id);
  if (error) throw new ApiError(500, "WISHLIST_UNAVAILABLE", "Could not delete the collection. Please try again.");
}

function cleanName(name: string): string {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) throw new ApiError(422, "VALIDATION", "Please give the collection a name.");
  return clean.slice(0, MAX_COLLECTION_NAME);
}

/* ------------------------------------------------------------------------------------------------
 * Items
 * ---------------------------------------------------------------------------------------------- */

/** Collections plus items; items are limited to `collectionId` when given, else span all collections. */
export async function getWishlist(userId: string, collectionId?: string): Promise<{ collections: WishlistCollectionView[]; items: WishlistItemView[] }> {
  const collections = await getCollections(userId);
  const scope = collectionId ? [collectionId] : collections.map((c) => c.id);
  if (collectionId && !collections.some((c) => c.id === collectionId)) {
    throw new ApiError(404, "COLLECTION_NOT_FOUND", "Collection not found.");
  }
  const items = await loadItems(scope, userId);
  return { collections, items };
}

/** Product ids in any of the user's collections, for heart state on product cards. */
export async function getWishlistProductIds(userId: string): Promise<Set<string>> {
  const { data } = await serviceClient().from("wishlist_items").select("product_id, wishlist_collections!inner(user_id)").eq("wishlist_collections.user_id", userId);
  return new Set((data ?? []).map((r) => r.product_id));
}

/**
 * Heart toggle. With a collection: toggles membership in that collection. Without: removes the
 * product from every collection if present anywhere, else adds it to the default collection.
 */
export async function toggleWishlist(userId: string, productId: string, variantId?: string | null, collectionId?: string): Promise<{ wishlisted: boolean }> {
  const db = serviceClient();
  const target = collectionId ? await ownedCollection(userId, collectionId) : await ensureDefaultCollection(userId);

  const scope = collectionId ? [target.id] : (await db.from("wishlist_collections").select("id").eq("user_id", userId)).data?.map((c) => c.id) ?? [target.id];
  const { data: present } = await db.from("wishlist_items").select("id").in("collection_id", scope).eq("product_id", productId);
  if (present && present.length > 0) {
    await db.from("wishlist_items").delete().in(
      "id",
      present.map((p) => p.id),
    );
    return { wishlisted: false };
  }

  const { data: product } = await db.from("variants").select("id, price, product_id, products!inner(id, price, is_active)").eq("product_id", productId).order("is_default", { ascending: false });
  const variants = product ?? [];
  if (variants.length === 0 || !variants[0].products.is_active) throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  const chosen = variantId ? variants.find((v) => v.id === variantId) ?? null : null;
  const priceAtAdd = chosen?.price ?? variants[0].products.price;

  const { error } = await db.from("wishlist_items").insert({ collection_id: target.id, product_id: productId, variant_id: chosen?.id ?? null, price_at_add: priceAtAdd });
  if (error && error.code !== "23505") throw new ApiError(500, "WISHLIST_UNAVAILABLE", "Could not update your wishlist. Please try again.");
  return { wishlisted: true };
}

export async function moveItem(userId: string, itemId: string, collectionId: string): Promise<void> {
  const db = serviceClient();
  const [item, target] = await Promise.all([ownedItem(userId, itemId), ownedCollection(userId, collectionId)]);
  if (item.collection_id === target.id) return;
  const { data: clash } = await db.from("wishlist_items").select("id").eq("collection_id", target.id).eq("product_id", item.product_id).maybeSingle();
  const { error } = clash
    ? await db.from("wishlist_items").delete().eq("id", item.id) // already in the target: fold into it
    : await db.from("wishlist_items").update({ collection_id: target.id }).eq("id", item.id);
  if (error) throw new ApiError(500, "WISHLIST_UNAVAILABLE", "Could not move the item. Please try again.");
}

export async function removeItem(userId: string, itemId: string): Promise<void> {
  const item = await ownedItem(userId, itemId);
  const { error } = await serviceClient().from("wishlist_items").delete().eq("id", item.id);
  if (error) throw new ApiError(500, "WISHLIST_UNAVAILABLE", "Could not remove the item. Please try again.");
}

async function ownedItem(userId: string, itemId: string): Promise<{ id: string; collection_id: string; product_id: string }> {
  const { data } = await serviceClient()
    .from("wishlist_items")
    .select("id, collection_id, product_id, wishlist_collections!inner(user_id)")
    .eq("id", itemId)
    .eq("wishlist_collections.user_id", userId)
    .maybeSingle();
  if (!data) throw new ApiError(404, "ITEM_NOT_FOUND", "Item not found in your wishlist.");
  return data;
}

/* ------------------------------------------------------------------------------------------------
 * Shared view
 * ---------------------------------------------------------------------------------------------- */

export async function getSharedCollection(token: string): Promise<{ collection: WishlistCollectionView; ownerName: string; items: WishlistItemView[] } | null> {
  if (!/^[a-f0-9]{8,64}$/i.test(token)) return null;
  const db = serviceClient();
  const { data: col } = await db.from("wishlist_collections").select("*, profiles!inner(name)").eq("share_token", token).maybeSingle();
  if (!col) return null;
  const [[collection], items] = await Promise.all([collectionViews([col]), loadItems([col.id], col.user_id)]);
  return { collection, ownerName: maskName(col.profiles.name), items };
}

/* ------------------------------------------------------------------------------------------------
 * Item views
 * ---------------------------------------------------------------------------------------------- */

async function loadItems(collectionIds: string[], ownerId: string): Promise<WishlistItemView[]> {
  if (collectionIds.length === 0) return [];
  const db = serviceClient();
  const [itemsRes, alertsRes] = await Promise.all([
    db.from("wishlist_items").select(ITEM_SELECT).in("collection_id", collectionIds).order("created_at", { ascending: false }),
    db.from("stock_alerts").select("variant_id").eq("user_id", ownerId),
  ]);
  if (itemsRes.error) throw new ApiError(500, "WISHLIST_UNAVAILABLE", "Could not load your wishlist. Please try again.");
  const alerted = new Set((alertsRes.data ?? []).map((a) => a.variant_id));
  const rows = itemsRes.data as unknown as ItemRow[];

  return rows.map((r) => {
    const p = r.products;
    const def = pickDefaultVariant(p.variants);
    const inStock = p.is_active && wishlistInStock(p.variants, r.variant_id);
    const hasAlert = p.variants.some((v) => alerted.has(v.id));
    return {
      id: r.id,
      productId: p.id,
      slug: p.slug,
      name: p.name,
      brandName: p.brands?.name ?? "",
      image: p.images[0] ?? "",
      price: p.price,
      mrp: p.mrp,
      priceAtAdd: r.price_at_add,
      priceDropped: isPriceDrop(p.price, r.price_at_add),
      inStock,
      backInStock: isBackInStock(inStock, hasAlert),
      variantId: r.variant_id,
      defaultVariantId: def?.id ?? "",
      hasVariants: p.variants.length > 1,
      collectionId: r.collection_id,
      createdAt: r.created_at,
    };
  });
}
