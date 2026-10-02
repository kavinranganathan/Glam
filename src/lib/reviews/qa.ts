import "server-only";

import { serviceClient } from "@/lib/supabase/service";
import { ApiError } from "@/lib/api/respond";
import { maskName } from "@/lib/utils/mask";
import type { AnswerView, QuestionView } from "./types";

interface AnswerRow {
  id: string;
  question_id: string;
  body: string;
  created_at: string;
  reported: boolean;
  profiles: { name: string | null } | null;
  brands: { name: string } | null;
}

interface QuestionRow {
  id: string;
  body: string;
  created_at: string;
  reported: boolean;
  profiles: { name: string | null } | null;
}

function answerView(a: AnswerRow): AnswerView {
  return {
    id: a.id,
    body: a.body,
    authorName: a.brands ? a.brands.name : maskName(a.profiles?.name),
    brandName: a.brands?.name ?? null,
    createdAt: a.created_at,
  };
}

/** Questions (newest first) with their answers; reported content is hidden. */
export async function listQuestions(productId: string): Promise<QuestionView[]> {
  const sb = serviceClient();
  const { data: questions, error } = await sb
    .from("questions")
    .select("id,body,created_at,reported,profiles!questions_user_id_fkey(name)")
    .eq("product_id", productId)
    .eq("reported", false)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const qRows = (questions ?? []) as unknown as QuestionRow[];
  if (!qRows.length) return [];
  const { data: answers, error: aError } = await sb
    .from("answers")
    .select("id,question_id,body,created_at,reported,profiles!answers_user_id_fkey(name),brands!answers_brand_id_fkey(name)")
    .in(
      "question_id",
      qRows.map((q) => q.id),
    )
    .eq("reported", false)
    .order("created_at", { ascending: true });
  if (aError) throw aError;
  const grouped = new Map<string, AnswerView[]>();
  for (const a of (answers ?? []) as unknown as AnswerRow[]) {
    const list = grouped.get(a.question_id) ?? [];
    list.push(answerView(a));
    grouped.set(a.question_id, list);
  }
  return qRows.map((q) => ({
    id: q.id,
    body: q.body,
    authorName: maskName(q.profiles?.name),
    createdAt: q.created_at,
    answers: grouped.get(q.id) ?? [],
  }));
}

export async function askQuestion(userId: string, productId: string, body: string): Promise<QuestionView> {
  const sb = serviceClient();
  const { data: product } = await sb.from("products").select("id").eq("id", productId).maybeSingle();
  if (!product) throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  const { data, error } = await sb
    .from("questions")
    .insert({ product_id: productId, user_id: userId, body: body.trim() })
    .select("id,body,created_at,reported,profiles!questions_user_id_fkey(name)")
    .single();
  if (error) throw error;
  const row = data as unknown as QuestionRow;
  return { id: row.id, body: row.body, authorName: maskName(row.profiles?.name), createdAt: row.created_at, answers: [] };
}

export async function answerQuestion(userId: string, questionId: string, body: string): Promise<AnswerView> {
  const sb = serviceClient();
  const { data: question } = await sb.from("questions").select("id").eq("id", questionId).maybeSingle();
  if (!question) throw new ApiError(404, "NOT_FOUND", "Question not found.");
  const { data, error } = await sb
    .from("answers")
    .insert({ question_id: questionId, user_id: userId, body: body.trim() })
    .select("id,question_id,body,created_at,reported,profiles!answers_user_id_fkey(name),brands!answers_brand_id_fkey(name)")
    .single();
  if (error) throw error;
  return answerView(data as unknown as AnswerRow);
}

/** Reporting hides the content immediately (single-flag moderation for Phase 1). */
export async function reportQuestion(questionId: string): Promise<void> {
  const { data, error } = await serviceClient().from("questions").update({ reported: true }).eq("id", questionId).select("id");
  if (error) throw error;
  if (!data?.length) throw new ApiError(404, "NOT_FOUND", "Question not found.");
}

export async function reportAnswer(answerId: string): Promise<void> {
  const { data, error } = await serviceClient().from("answers").update({ reported: true }).eq("id", answerId).select("id");
  if (error) throw error;
  if (!data?.length) throw new ApiError(404, "NOT_FOUND", "Answer not found.");
}
