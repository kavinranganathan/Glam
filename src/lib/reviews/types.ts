/** Client-safe view models for reviews and Q&A (no server imports). */

import type { HistogramRow } from "./eligibility";

export type ReviewSort = "recent" | "helpful" | "critical";

export interface ReviewFilters {
  star?: number;
  skinType?: string;
  concern?: string;
  withPhotos?: boolean;
  sort?: ReviewSort;
  page?: number;
  pageSize?: number;
}

export interface ReviewView {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  photos: string[];
  skinType: string | null;
  concerns: string[];
  helpfulCount: number;
  createdAt: string;
  /** Masked per PRD §8.5.8, e.g. "P***a". */
  authorName: string;
  verified: true;
  brandResponse: string | null;
  brandRespondedAt: string | null;
  helpfulByMe: boolean;
}

export interface ReviewListResult {
  items: ReviewView[];
  total: number;
  page: number;
  pageSize: number;
  histogram: HistogramRow[];
  average: number;
  /** Total approved reviews regardless of filters. */
  totalAll: number;
}

export interface ReviewEligibilityResponse {
  eligible: boolean;
  orderItemId: string | null;
  reason: "not_logged_in" | "not_purchased" | "too_early" | "window_closed" | "already_reviewed" | null;
}

export interface AnswerView {
  id: string;
  body: string;
  authorName: string;
  brandName: string | null;
  createdAt: string;
}

export interface QuestionView {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
  answers: AnswerView[];
}
