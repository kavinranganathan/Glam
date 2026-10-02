import "server-only";

import { ApiError } from "@/lib/api/respond";
import { serviceClient } from "@/lib/supabase/service";
import type { Enums, Tables } from "@/lib/supabase/types";
import { BRAND_RESPONSE_MAX } from "./rules";

export type ReviewStatus = Enums<"review_status">;

export interface AdminReviewRow {
  id: string;
  createdAt: string;
  rating: number;
  title: string | null;
  body: string;
  photos: string[];
  status: ReviewStatus;
  brandResponse: string | null;
  brandRespondedAt: string | null;
  product: { id: string; name: string; slug: string };
  user: { name: string | null; email: string | null } | null;
}

type ReviewJoin = Tables<"reviews"> & {
  products: { name: string; slug: string } | null;
  profiles: { name: string | null; email: string | null } | null;
};

export async function listRecentReviews(status?: ReviewStatus, limit = 50): Promise<AdminReviewRow[]> {
  let q = serviceClient()
    .from("reviews")
    .select("*, products(name, slug), profiles!reviews_user_id_fkey(name, email)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data as ReviewJoin[]).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    rating: r.rating,
    title: r.title,
    body: r.body,
    photos: r.photos,
    status: r.status,
    brandResponse: r.brand_response,
    brandRespondedAt: r.brand_responded_at,
    product: { id: r.product_id, name: r.products?.name ?? "Unknown product", slug: r.products?.slug ?? "" },
    user: r.profiles,
  }));
}

async function loadReview(id: string) {
  const { data, error } = await serviceClient().from("reviews").select("id, product_id, status").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "NOT_FOUND", "Review not found.");
  return data;
}

/** Approve / reject and recompute the product rating. */
export async function setReviewStatus(id: string, status: ReviewStatus): Promise<void> {
  const review = await loadReview(id);
  const db = serviceClient();
  const { error } = await db.from("reviews").update({ status }).eq("id", id);
  if (error) throw error;
  const { error: rpcError } = await db.rpc("recompute_product_rating", { p_product: review.product_id });
  if (rpcError) throw rpcError;
}

/** Brand response (≤500 chars). Pass null/empty to clear. */
export async function respondToReview(id: string, response: string | null): Promise<void> {
  await loadReview(id);
  const text = response?.trim() || null;
  if (text && text.length > BRAND_RESPONSE_MAX) {
    throw new ApiError(422, "VALIDATION", `Brand response must be ${BRAND_RESPONSE_MAX} characters or fewer.`);
  }
  const { error } = await serviceClient()
    .from("reviews")
    .update({ brand_response: text, brand_responded_at: text ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

export interface ReportedQa {
  id: string;
  kind: "question" | "answer";
  body: string;
  createdAt: string;
  productName: string;
  productSlug: string;
  userName: string | null;
}

export async function listReportedQa(): Promise<ReportedQa[]> {
  const db = serviceClient();
  const [questions, answers] = await Promise.all([
    db.from("questions").select("id, body, created_at, products(name, slug), profiles!questions_user_id_fkey(name)").eq("reported", true).order("created_at", { ascending: false }).limit(100),
    db
      .from("answers")
      .select("id, body, created_at, profiles!answers_user_id_fkey(name), questions(products(name, slug))")
      .eq("reported", true)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (questions.error) throw questions.error;
  if (answers.error) throw answers.error;
  type Q = { id: string; body: string; created_at: string; products: { name: string; slug: string } | null; profiles: { name: string | null } | null };
  type A = { id: string; body: string; created_at: string; profiles: { name: string | null } | null; questions: { products: { name: string; slug: string } | null } | null };
  const qs = (questions.data as unknown as Q[]).map<ReportedQa>((q) => ({
    id: q.id,
    kind: "question",
    body: q.body,
    createdAt: q.created_at,
    productName: q.products?.name ?? "—",
    productSlug: q.products?.slug ?? "",
    userName: q.profiles?.name ?? null,
  }));
  const as = (answers.data as unknown as A[]).map<ReportedQa>((a) => ({
    id: a.id,
    kind: "answer",
    body: a.body,
    createdAt: a.created_at,
    productName: a.questions?.products?.name ?? "—",
    productSlug: a.questions?.products?.slug ?? "",
    userName: a.profiles?.name ?? null,
  }));
  return [...qs, ...as].sort((x, y) => y.createdAt.localeCompare(x.createdAt));
}

export async function deleteQa(kind: "question" | "answer", id: string): Promise<void> {
  const table = kind === "question" ? "questions" : "answers";
  const { error } = await serviceClient().from(table).delete().eq("id", id);
  if (error) throw error;
}
