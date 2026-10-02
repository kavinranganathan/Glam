import "server-only";

import { serviceClient } from "@/lib/supabase/service";
import { ApiError } from "@/lib/api/respond";
import { maskName } from "@/lib/utils/mask";
import { reviewAverage, reviewHistogram, type StarCounts } from "./eligibility";
import type { ReviewFilters, ReviewListResult, ReviewView } from "./types";

const REVIEW_SELECT =
  "id,rating,title,body,photos,skin_type,concerns,helpful_count,created_at,brand_response,brand_responded_at,profiles!reviews_user_id_fkey(name)";

interface ReviewRow {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  photos: string[];
  skin_type: string | null;
  concerns: string[];
  helpful_count: number;
  created_at: string;
  brand_response: string | null;
  brand_responded_at: string | null;
  profiles: { name: string | null } | null;
}

function toView(r: ReviewRow, votedIds: ReadonlySet<string>): ReviewView {
  return {
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    photos: r.photos ?? [],
    skinType: r.skin_type,
    concerns: r.concerns ?? [],
    helpfulCount: r.helpful_count,
    createdAt: r.created_at,
    authorName: maskName(r.profiles?.name),
    verified: true,
    brandResponse: r.brand_response,
    brandRespondedAt: r.brand_responded_at,
    helpfulByMe: votedIds.has(r.id),
  };
}

async function starCounts(productId: string): Promise<StarCounts> {
  const { data, error } = await serviceClient().from("reviews").select("rating").eq("product_id", productId).eq("status", "approved");
  if (error) throw error;
  const counts: StarCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of data) {
    const s = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    counts[s] += 1;
  }
  return counts;
}

export async function listReviews(productId: string, f: ReviewFilters = {}, viewerId: string | null = null): Promise<ReviewListResult> {
  const page = Math.max(1, f.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, f.pageSize ?? 10));
  const sb = serviceClient();
  let q = sb.from("reviews").select(REVIEW_SELECT, { count: "exact" }).eq("product_id", productId).eq("status", "approved");
  if (f.star) q = q.eq("rating", f.star);
  if (f.skinType) q = q.eq("skin_type", f.skinType);
  if (f.concern) q = q.contains("concerns", [f.concern]);
  if (f.withPhotos) q = q.not("photos", "eq", "{}");
  switch (f.sort ?? "recent") {
    case "helpful":
      q = q.order("helpful_count", { ascending: false }).order("created_at", { ascending: false });
      break;
    case "critical":
      q = q.order("rating", { ascending: true }).order("created_at", { ascending: false });
      break;
    default:
      q = q.order("created_at", { ascending: false });
  }
  const from = (page - 1) * pageSize;
  const [{ data, error, count }, counts] = await Promise.all([q.range(from, from + pageSize - 1), starCounts(productId)]);
  if (error) throw error;
  const rows = (data ?? []) as unknown as ReviewRow[];
  let voted = new Set<string>();
  if (viewerId && rows.length) {
    const { data: votes } = await sb
      .from("review_votes")
      .select("review_id")
      .eq("user_id", viewerId)
      .in(
        "review_id",
        rows.map((r) => r.id),
      );
    voted = new Set((votes ?? []).map((v) => v.review_id));
  }
  const histogram = reviewHistogram(counts);
  return {
    items: rows.map((r) => toView(r, voted)),
    total: count ?? rows.length,
    page,
    pageSize,
    histogram,
    average: reviewAverage(counts),
    totalAll: histogram.reduce((s, h) => s + h.count, 0),
  };
}

export interface ReviewableOrderItem {
  orderItemId: string;
  deliveredAt: string | null;
  status: string;
}

/**
 * Latest order item of this product owned by the user that has not been reviewed yet.
 * Prefers delivered orders so the caller can report the most useful reason.
 */
export async function findReviewableOrderItem(userId: string, productId: string): Promise<ReviewableOrderItem | null> {
  const sb = serviceClient();
  const { data: orders, error } = await sb
    .from("orders")
    .select("id,status,delivered_at,placed_at")
    .eq("user_id", userId)
    .not("status", "in", "(cancelled)")
    .order("placed_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  if (!orders.length) return null;
  const orderIds = orders.map((o) => o.id);
  const { data: items, error: itemsError } = await sb
    .from("order_items")
    .select("id,order_id")
    .eq("product_id", productId)
    .in("order_id", orderIds);
  if (itemsError) throw itemsError;
  if (!items.length) return null;
  const { data: reviewed } = await sb
    .from("reviews")
    .select("order_item_id")
    .in(
      "order_item_id",
      items.map((i) => i.id),
    );
  const reviewedIds = new Set((reviewed ?? []).map((r) => r.order_item_id));
  const byOrder = new Map(orders.map((o) => [o.id, o] as const));
  const candidates = items
    .map((i) => ({ item: i, order: byOrder.get(i.order_id)!, reviewed: reviewedIds.has(i.id) }))
    .sort((a, b) => {
      // Delivered + unreviewed first, then newest.
      const score = (c: typeof a) => (c.reviewed ? 0 : 2) + (c.order.delivered_at ? 1 : 0);
      return score(b) - score(a) || b.order.placed_at.localeCompare(a.order.placed_at);
    });
  const best = candidates[0];
  if (best.reviewed) return { orderItemId: best.item.id, deliveredAt: best.order.delivered_at, status: "already_reviewed" };
  return { orderItemId: best.item.id, deliveredAt: best.order.delivered_at, status: best.order.status };
}

export interface SubmitReviewPayload {
  orderItemId: string;
  rating: number;
  title?: string | null;
  body: string;
  photos?: string[];
  skinType?: string | null;
  concerns?: string[];
}

/** Calls `submit_review`; SQL exceptions (REVIEW_TOO_EARLY…) are mapped by `handle()`. */
export async function submitReview(userId: string, payload: SubmitReviewPayload): Promise<string> {
  const { data, error } = await serviceClient().rpc("submit_review", {
    p_user: userId,
    p_payload: {
      order_item_id: payload.orderItemId,
      rating: payload.rating,
      title: payload.title?.trim() || null,
      body: payload.body.trim(),
      photos: payload.photos ?? [],
      skin_type: payload.skinType ?? null,
      concerns: payload.concerns ?? [],
    },
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function toggleHelpful(userId: string, reviewId: string): Promise<{ helpful: boolean; count: number }> {
  const sb = serviceClient();
  const { data: review, error } = await sb.from("reviews").select("id,helpful_count").eq("id", reviewId).maybeSingle();
  if (error) throw error;
  if (!review) throw new ApiError(404, "NOT_FOUND", "Review not found.");
  const { data: existing } = await sb.from("review_votes").select("review_id").eq("review_id", reviewId).eq("user_id", userId).maybeSingle();
  const delta = existing ? -1 : 1;
  if (existing) {
    const { error: delError } = await sb.from("review_votes").delete().eq("review_id", reviewId).eq("user_id", userId);
    if (delError) throw delError;
  } else {
    const { error: insError } = await sb.from("review_votes").insert({ review_id: reviewId, user_id: userId });
    if (insError) throw insError;
  }
  const count = Math.max(0, review.helpful_count + delta);
  const { error: updError } = await sb.from("reviews").update({ helpful_count: count }).eq("id", reviewId);
  if (updError) throw updError;
  return { helpful: !existing, count };
}
